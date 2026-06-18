import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/places/geocode";
import { cached, throttle } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await cached(`geocode:${q.toLowerCase()}`, 24 * 60 * 60 * 1000, async () => {
      // Nominatim asks for max 1 request/second.
      await throttle("nominatim", 1100);
      return geocode(q);
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "geocode failed" }, { status: 502 });
  }
}
