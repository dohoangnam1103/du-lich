import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { favoriteSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.query.favorites.findMany({
      where: eq(favorites.userId, user.id),
      orderBy: [desc(favorites.createdAt)],
    });
    return NextResponse.json({ favorites: rows });
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
    const parsed = favoriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { placeId, placeName, lat, lng } = parsed.data;
    await db
      .insert(favorites)
      .values({ userId: user.id, placeId, placeName, lat, lng })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
