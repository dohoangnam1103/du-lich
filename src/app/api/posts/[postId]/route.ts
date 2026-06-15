import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { posts } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.position)] },
      user: { columns: { id: true, displayName: true, avatarUrl: true } },
      comments: {
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { user: { columns: { displayName: true, avatarUrl: true } } },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}
