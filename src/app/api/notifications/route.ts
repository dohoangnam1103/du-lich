import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
      with: {
        actor: { columns: { id: true, displayName: true, name: true, avatarUrl: true, image: true } },
      },
    });
    const [unread] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
    return NextResponse.json({
      notifications: rows,
      unread: Number(unread?.count ?? 0),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

// Marks all of the user's notifications as read.
export async function POST() {
  try {
    const user = await requireUser();
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, user.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
