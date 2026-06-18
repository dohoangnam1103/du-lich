import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites, reviews, posts } from "@/db/schema";
import { sql, isNotNull } from "drizzle-orm";
import { cached } from "@/lib/cache";

interface Popular {
  placeId: string;
  placeName: string | null;
  score: number;
}

// Aggregates engagement signals (favorites, reviews, posts) into a popularity
// score per place. Cached briefly since it scans community tables.
async function computePopular(): Promise<Popular[]> {
  const acc = new Map<string, { name: string | null; score: number }>();

  function add(placeId: string, name: string | null, weight: number) {
    const cur = acc.get(placeId) ?? { name: null, score: 0 };
    cur.score += weight;
    if (!cur.name && name) cur.name = name;
    acc.set(placeId, cur);
  }

  const favRows = await db
    .select({
      placeId: favorites.placeId,
      name: sql<string | null>`max(${favorites.placeName})`,
      count: sql<number>`count(*)`,
    })
    .from(favorites)
    .groupBy(favorites.placeId);
  for (const r of favRows) add(r.placeId, r.name, Number(r.count) * 2);

  const revRows = await db
    .select({
      placeId: reviews.placeId,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .groupBy(reviews.placeId);
  for (const r of revRows) add(r.placeId, null, Number(r.count) * 2);

  const postRows = await db
    .select({
      placeId: posts.placeId,
      name: sql<string | null>`max(${posts.placeName})`,
      count: sql<number>`count(*)`,
    })
    .from(posts)
    .where(isNotNull(posts.placeId))
    .groupBy(posts.placeId);
  for (const r of postRows) {
    if (r.placeId) add(r.placeId, r.name, Number(r.count));
  }

  return [...acc.entries()]
    .map(([placeId, v]) => ({ placeId, placeName: v.name, score: v.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export async function GET() {
  try {
    const places = await cached("popular", 5 * 60 * 1000, computePopular);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
