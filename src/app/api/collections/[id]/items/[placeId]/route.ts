import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; placeId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, placeId } = await params;

    const owned = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, user.id)),
      columns: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db
      .delete(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, id),
          eq(collectionItems.placeId, decodeURIComponent(placeId)),
        ),
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
