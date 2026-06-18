import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = profileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await db
      .update(users)
      .set({ displayName: parsed.data.displayName, name: parsed.data.displayName })
      .where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
