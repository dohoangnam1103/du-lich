import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ placeId: string }> },
) {
  try {
    const user = await requireUser();
    const { placeId } = await params;
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.placeId, placeId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
