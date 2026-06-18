import { NextResponse } from "next/server";
import { searchNearby } from "@/lib/places/client";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { radiusForVehicle, VEHICLES, type Vehicle } from "@/lib/vehicle";
import { communityRatings } from "@/lib/places/ratings";
import { cached, coarse } from "@/lib/cache";
import {
  osmTagsForCategory,
  CATEGORIES,
  type Category,
} from "@/lib/places/types";

// Hard cap so an empty area never triggers an unbounded country-wide query.
const MAX_RADIUS_METERS = 50000;

// Builds an increasing list of radii starting from the vehicle's base radius,
// tripling each step up to MAX_RADIUS_METERS. Used to progressively widen the
// search when the initial radius yields no results.
function radiusLadder(base: number): number[] {
  const ladder = [base];
  let r = base;
  while (r < MAX_RADIUS_METERS) {
    r = Math.min(r * 3, MAX_RADIUS_METERS);
    ladder.push(r);
  }
  return ladder;
}

// Maps each placeId to the first image from its most recent community post,
// used as a thumbnail fallback when OSM has no Wikipedia image.
async function communityImages(placeIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (placeIds.length === 0) return result;

  const rows = await db.query.posts.findMany({
    where: inArray(posts.placeId, placeIds),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    columns: { placeId: true },
    with: {
      media: {
        where: (m, { eq }) => eq(m.type, "image"),
        orderBy: (m, { asc }) => [asc(m.position)],
        limit: 1,
      },
    },
  });

  for (const row of rows) {
    if (!row.placeId || result.has(row.placeId)) continue;
    const url = row.media[0]?.url;
    if (url) result.set(row.placeId, url);
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);
  const vehicle = searchParams.get("vehicle") as Vehicle;
  const category = (searchParams.get("category") ?? "food") as Category;

  if (
    latParam === null ||
    lngParam === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  if (!VEHICLES.includes(vehicle)) {
    return NextResponse.json({ error: "invalid vehicle" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  try {
    const baseRadius = radiusForVehicle(vehicle);
    const tagFilters = osmTagsForCategory(category);

    // Progressively widen the radius until we find something or hit the cap.
    // Cache the Overpass result set per coarse location + vehicle + category.
    const cacheKey = `nearby:${coarse(lat)}:${coarse(lng)}:${vehicle}:${category}`;
    const { places, usedRadius } = await cached(cacheKey, 10 * 60 * 1000, async () => {
      let found: Awaited<ReturnType<typeof searchNearby>> = [];
      let radius = baseRadius;
      for (const radiusMeters of radiusLadder(baseRadius)) {
        radius = radiusMeters;
        found = await searchNearby({ lat, lng, radiusMeters, tagFilters });
        if (found.length > 0) break;
      }
      return { places: found, usedRadius: radius };
    });

    // Fill thumbnails from community posts for places without a Wikipedia image.
    const needImage = places.filter((p) => !p.imageUrl).map((p) => p.placeId);
    const images = await communityImages(needImage);
    for (const p of places) {
      if (!p.imageUrl) {
        const url = images.get(p.placeId);
        if (url) p.imageUrl = url;
      }
    }

    // Attach community ratings (average + count) for all returned places.
    const ratings = await communityRatings(places.map((p) => p.placeId));
    for (const p of places) {
      const r = ratings.get(p.placeId);
      if (r) {
        p.rating = r.rating;
        p.ratingCount = r.count;
      }
    }

    return NextResponse.json({
      places,
      radiusMeters: usedRadius,
      expanded: usedRadius > baseRadius,
    });
  } catch {
    return NextResponse.json({ error: "places lookup failed" }, { status: 500 });
  }
}
