import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, reviewMedia } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { reviewSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { placeId, rating, body, media } = parsed.data;
    const id = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(reviews)
        .values({ userId: user.id, placeId, rating, body })
        .onConflictDoUpdate({
          target: [reviews.userId, reviews.placeId],
          set: { rating, body },
        })
        .returning();
      await tx.delete(reviewMedia).where(eq(reviewMedia.reviewId, r.id));
      if (media.length > 0) {
        await tx.insert(reviewMedia).values(
          media.map((m, i) => ({
            reviewId: r.id,
            url: m.url,
            type: m.type,
            position: i,
          })),
        );
      }
      return r.id;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
