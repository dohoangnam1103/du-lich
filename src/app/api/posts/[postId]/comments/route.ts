import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { commentSchema } from "@/lib/validation";

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
    return NextResponse.json({ id: c.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
