import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { commentSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    const parsed = commentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [c] = await db
      .insert(comments)
      .values({ postId, userId: user.id, body: parsed.data.body })
      .returning();

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { userId: true },
    });
    if (post) {
      await notify({ userId: post.userId, actorId: user.id, type: "comment", postId });
    }
    return NextResponse.json({ id: c.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
