import { db } from "@/db";
import { reviews } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";

export interface RatingSummary {
  rating: number; // average, rounded to 1 decimal
  count: number;
}

// Aggregates community review ratings for a set of placeIds in one query.
export async function communityRatings(
  placeIds: string[],
): Promise<Map<string, RatingSummary>> {
  const result = new Map<string, RatingSummary>();
  const unique = [...new Set(placeIds)].filter(Boolean);
  if (unique.length === 0) return result;

  const rows = await db
    .select({
      placeId: reviews.placeId,
      avg: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(inArray(reviews.placeId, unique))
    .groupBy(reviews.placeId);

  for (const row of rows) {
    const count = Number(row.count);
    if (!count) continue;
    result.set(row.placeId, {
      rating: Math.round(Number(row.avg) * 10) / 10,
      count,
    });
  }
  return result;
}

export async function communityRating(
  placeId: string,
): Promise<RatingSummary | null> {
  const map = await communityRatings([placeId]);
  return map.get(placeId) ?? null;
}
