import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const collection = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, user.id)),
    });
    if (!collection) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const items = await db.query.collectionItems.findMany({
      where: eq(collectionItems.collectionId, id),
      orderBy: [asc(collectionItems.position), asc(collectionItems.createdAt)],
    });
    return NextResponse.json({ collection, items });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await db
      .delete(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
