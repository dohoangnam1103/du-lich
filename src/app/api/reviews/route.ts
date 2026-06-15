import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { reviewSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { placeId, rating, body } = parsed.data;
    const [r] = await db
      .insert(reviews)
      .values({ userId: user.id, placeId, rating, body })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.placeId],
        set: { rating, body },
      })
      .returning();
    return NextResponse.json({ id: r.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
