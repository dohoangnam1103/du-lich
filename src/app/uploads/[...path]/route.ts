import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  // Prevent path traversal: resolve and confirm it stays inside UPLOAD_DIR.
  const resolved = path.resolve(UPLOAD_DIR, ...parts);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    await stat(resolved);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const ext = path.extname(resolved).toLowerCase();
  const stream = createReadStream(resolved);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
