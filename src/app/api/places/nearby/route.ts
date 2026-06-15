import { NextResponse } from "next/server";
import { searchNearby } from "@/lib/places/client";
import { radiusForVehicle, VEHICLES, type Vehicle } from "@/lib/vehicle";
import {
  googleTypesForCategory,
  CATEGORIES,
  type Category,
} from "@/lib/places/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);
  const vehicle = searchParams.get("vehicle") as Vehicle;
  const category = (searchParams.get("category") ?? "food") as Category;

  if (
    latParam === null ||
    lngParam === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  if (!VEHICLES.includes(vehicle)) {
    return NextResponse.json({ error: "invalid vehicle" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  try {
    const places = await searchNearby(
      {
        lat,
        lng,
        radiusMeters: radiusForVehicle(vehicle),
        includedTypes: googleTypesForCategory(category),
      },
      { apiKey: process.env.GOOGLE_MAPS_API_KEY! },
    );
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "places lookup failed" }, { status: 500 });
  }
}
