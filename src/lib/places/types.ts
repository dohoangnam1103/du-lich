export const CATEGORIES = ["food", "cafe", "fun", "sightseeing"] as const;
export type Category = (typeof CATEGORIES)[number];

const CATEGORY_TYPES: Record<Category, string[]> = {
  food: ["restaurant", "meal_takeaway"],
  cafe: ["cafe", "coffee_shop"],
  fun: ["amusement_park", "tourist_attraction", "park"],
  sightseeing: ["tourist_attraction", "museum", "park"],
};

export function googleTypesForCategory(category: Category): string[] {
  return CATEGORY_TYPES[category] ?? CATEGORY_TYPES.food;
}

export interface Place {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  distanceMeters?: number;
  photoName?: string; // Google photo resource name (for fetching photo via API)
}

export interface PlaceReview {
  authorName: string;
  authorUri?: string;
  rating: number;
  text?: string;
  relativeTime?: string;
}

export interface PlaceDetail extends Place {
  reviews: PlaceReview[];
  photoNames: string[];
}
