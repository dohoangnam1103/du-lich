import { NextResponse } from "next/server";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { reviews } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const user = await requireUser();
    const { reviewId } = await params;
    const result = await db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, user.id)))
      .returning({ id: reviews.id });
    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
