import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { collectionCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.query.collections.findMany({
      where: eq(collections.userId, user.id),
      orderBy: [desc(collections.createdAt)],
      with: { items: true },
    });
    const list = rows.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      itemCount: c.items.length,
    }));
    return NextResponse.json({ collections: list });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = collectionCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [created] = await db
      .insert(collections)
      .values({ userId: user.id, name: parsed.data.name })
      .returning();
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
