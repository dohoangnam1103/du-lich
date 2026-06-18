import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { collectionItemSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Ensure the collection belongs to the requesting user.
    const owned = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, user.id)),
      columns: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const parsed = collectionItemSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { placeId, placeName, lat, lng } = parsed.data;
    await db
      .insert(collectionItems)
      .values({ collectionId: id, placeId, placeName, lat, lng })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
