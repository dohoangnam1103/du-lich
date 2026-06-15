import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { saveUpload } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const saved = await saveUpload(file);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
