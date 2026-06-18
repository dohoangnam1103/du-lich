import { NextRequest, NextResponse } from "next/server";
import { searchByName } from "@/lib/places/client";
import { communityRatings } from "@/lib/places/ratings";
import { cached, coarse } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));

  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  try {
    const key = `search:${q.toLowerCase()}:${coarse(lat)}:${coarse(lng)}`;
    const places = await cached(key, 10 * 60 * 1000, () =>
      searchByName({ query: q, lat, lng, radiusMeters: 30000, maxResults: 40 }),
    );

    const ratings = await communityRatings(places.map((p) => p.placeId));
    for (const p of places) {
      const r = ratings.get(p.placeId);
      if (r) {
        p.rating = r.rating;
        p.ratingCount = r.count;
      }
    }

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "search failed" }, { status: 502 });
  }
}
