import { NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/places/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  try {
    const place = await getPlaceDetail(placeId, {
      apiKey: process.env.GOOGLE_MAPS_API_KEY!,
    });
    // Plan 2 fills these from Postgres (posts + reviews for this place_id).
    return NextResponse.json({ place, userPosts: [], userReviews: [] });
  } catch {
    return NextResponse.json({ error: "place detail failed" }, { status: 500 });
  }
}
