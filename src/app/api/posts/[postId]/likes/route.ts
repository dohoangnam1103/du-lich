import { NextResponse } from "next/server";
import { db } from "@/db";
import { postLikes, posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { notify } from "@/lib/notify";

async function likeCount(postId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));
  return Number(row?.count ?? 0);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    await db
      .insert(postLikes)
      .values({ postId, userId: user.id })
      .onConflictDoNothing();

    // Notify the post owner.
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { userId: true },
    });
    if (post) {
      await notify({ userId: post.userId, actorId: user.id, type: "like", postId });
    }
    return NextResponse.json({ liked: true, count: await likeCount(postId) });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)));
    return NextResponse.json({ liked: false, count: await likeCount(postId) });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
