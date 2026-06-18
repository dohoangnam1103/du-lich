import { NextResponse } from "next/server";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { comments } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { commentSchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  try {
    const user = await requireUser();
    const { commentId } = await params;
    const parsed = commentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const result = await db
      .update(comments)
      .set({ body: parsed.data.body })
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)))
      .returning({ id: comments.id });
    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  try {
    const user = await requireUser();
    const { commentId } = await params;
    const result = await db
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)))
      .returning({ id: comments.id });
    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
