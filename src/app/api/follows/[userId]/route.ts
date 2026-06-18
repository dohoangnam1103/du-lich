import { NextResponse } from "next/server";
import { db } from "@/db";
import { follows } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { notify } from "@/lib/notify";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await requireUser();
    const { userId } = await params;
    if (userId === user.id) {
      return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
    }
    await db
      .insert(follows)
      .values({ followerId: user.id, followingId: userId })
      .onConflictDoNothing();
    await notify({ userId, actorId: user.id, type: "follow" });
    return NextResponse.json({ following: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await requireUser();
    const { userId } = await params;
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, user.id), eq(follows.followingId, userId)));
    return NextResponse.json({ following: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
