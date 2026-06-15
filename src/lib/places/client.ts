import { haversineMeters } from "@/lib/geo";
import type { Place } from "./types";

type FetchImpl = typeof fetch;

interface ClientOptions {
  apiKey: string;
  fetchImpl?: FetchImpl;
}

interface NearbyParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
  maxResults?: number;
}

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
].join(",");

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string }[];
}

export async function searchNearby(
  params: NearbyParams,
  options: ClientOptions,
): Promise<Place[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResults ?? 20,
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radiusMeters,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Places API nearby failed: ${res.status}`);
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const places: Place[] = (data.places ?? []).map((p) => {
    const lat = p.location?.latitude ?? 0;
    const lng = p.location?.longitude ?? 0;
    return {
      placeId: p.id,
      name: p.displayName?.text ?? "(không tên)",
      address: p.formattedAddress,
      lat,
      lng,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      photoName: p.photos?.[0]?.name,
      distanceMeters: haversineMeters(params.lat, params.lng, lat, lng),
    };
  });

  places.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return places;
}
