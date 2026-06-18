import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { z } from "zod";

const reorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const owned = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, user.id)),
      columns: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const parsed = reorderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Persist the new order as the `position` of each item.
    await db.transaction(async (tx) => {
      for (let i = 0; i < parsed.data.order.length; i++) {
        await tx
          .update(collectionItems)
          .set({ position: i })
          .where(
            and(
              eq(collectionItems.collectionId, id),
              eq(collectionItems.placeId, parsed.data.order[i]),
            ),
          );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
