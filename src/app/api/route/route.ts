import { NextRequest, NextResponse } from "next/server";
import { getRoute, getTrip, type RoutePoint } from "@/lib/places/route";

// Parses "lat,lng;lat,lng;..." into RoutePoint[].
function parsePoints(raw: string | null): RoutePoint[] {
  if (!raw) return [];
  const points: RoutePoint[] = [];
  for (const pair of raw.split(";")) {
    const [latS, lngS] = pair.split(",");
    const lat = Number(latS);
    const lng = Number(lngS);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng });
    }
  }
  return points;
}

export async function GET(req: NextRequest) {
  const points = parsePoints(req.nextUrl.searchParams.get("points"));
  if (points.length < 2) {
    return NextResponse.json(
      { error: "need at least 2 points" },
      { status: 400 },
    );
  }
  if (points.length > 25) {
    return NextResponse.json({ error: "too many points" }, { status: 400 });
  }
  const optimize = req.nextUrl.searchParams.get("optimize") === "1";
  try {
    if (optimize) {
      const trip = await getTrip(points);
      if (!trip) {
        return NextResponse.json({ error: "no route found" }, { status: 404 });
      }
      return NextResponse.json({ route: trip, order: trip.order });
    }
    const route = await getRoute(points);
    if (!route) {
      return NextResponse.json({ error: "no route found" }, { status: 404 });
    }
    return NextResponse.json({ route });
  } catch {
    return NextResponse.json({ error: "routing failed" }, { status: 502 });
  }
}
