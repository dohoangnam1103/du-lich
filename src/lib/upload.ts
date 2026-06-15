import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

export function isAllowedMime(mime: string): boolean {
  return mime in MIME_EXT;
}

export function pickExtension(mime: string): string {
  return MIME_EXT[mime] ?? "";
}

export function mediaTypeOf(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveUpload(
  file: File,
): Promise<{ url: string; type: "image" | "video" }> {
  if (!isAllowedMime(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${pickExtension(file.type)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return { url: `/uploads/${name}`, type: mediaTypeOf(file.type) };
}
