import { NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/places/client";
import { auth } from "@/auth";
import { db } from "@/db";
import { posts, reviews, favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  try {
    const place = await getPlaceDetail(placeId);

    const userPosts = await db.query.posts.findMany({
      where: eq(posts.placeId, placeId),
      orderBy: [desc(posts.createdAt)],
      limit: 20,
      with: {
        media: { orderBy: (m, { asc }) => [asc(m.position)] },
        user: { columns: { displayName: true, avatarUrl: true } },
      },
    });

    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.placeId, placeId),
      orderBy: [desc(reviews.createdAt)],
      with: { user: { columns: { displayName: true, avatarUrl: true } } },
    });

    const session = await auth();
    let isFavorite = false;
    if (session?.user?.id) {
      const fav = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, session.user.id),
          eq(favorites.placeId, placeId),
        ),
      });
      isFavorite = !!fav;
    }

    return NextResponse.json({ place, userPosts, userReviews, isFavorite });
  } catch {
    return NextResponse.json({ error: "place detail failed" }, { status: 500 });
  }
}
