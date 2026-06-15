import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { favoriteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = favoriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await db
      .insert(favorites)
      .values({ userId: user.id, placeId: parsed.data.placeId })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
