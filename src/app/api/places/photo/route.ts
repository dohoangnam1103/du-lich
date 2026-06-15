import { NextResponse } from "next/server";

// Exact Google photo resource shape: places/{placeId}/photos/{photoId}
const NAME_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const MAX_WIDTH_LIMIT = 4800;
const DEFAULT_WIDTH = 800;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name"); // e.g. places/xxx/photos/yyy
  const rawWidth = searchParams.get("w");

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  // Prevent SSRF / path traversal: name is interpolated into the upstream URL path.
  if (!NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  let maxWidth = DEFAULT_WIDTH;
  if (rawWidth !== null) {
    // Reject non-integers, negatives, zero, and out-of-range values.
    if (!/^\d+$/.test(rawWidth)) {
      return NextResponse.json({ error: "invalid w" }, { status: 400 });
    }
    const parsed = Number.parseInt(rawWidth, 10);
    if (parsed < 1 || parsed > MAX_WIDTH_LIMIT) {
      return NextResponse.json({ error: "invalid w" }, { status: 400 });
    }
    maxWidth = parsed;
  }

  const url =
    `https://places.googleapis.com/v1/${name}/media` +
    `?maxWidthPx=${encodeURIComponent(String(maxWidth))}` +
    `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "photo failed" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
