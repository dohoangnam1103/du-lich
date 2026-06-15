export const CATEGORIES = ["food", "cafe", "fun", "sightseeing"] as const;
export type Category = (typeof CATEGORIES)[number];

// Overpass tag filters per category. Each entry is a [key, value] pair that
// becomes a `node["key"="value"]` clause in the Overpass query.
const CATEGORY_TAGS: Record<Category, [string, string][]> = {
  food: [
    ["amenity", "restaurant"],
    ["amenity", "fast_food"],
  ],
  cafe: [["amenity", "cafe"]],
  fun: [
    ["leisure", "park"],
    ["tourism", "attraction"],
    ["tourism", "theme_park"],
  ],
  sightseeing: [
    ["tourism", "attraction"],
    ["tourism", "museum"],
    ["historic", "monument"],
  ],
};

export function osmTagsForCategory(category: Category): [string, string][] {
  return CATEGORY_TAGS[category] ?? CATEGORY_TAGS.food;
}

export interface Place {
  placeId: string; // OSM element ref, e.g. "node/123456"
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceMeters?: number;
  imageUrl?: string; // Wikipedia thumbnail when the POI has a wikipedia/wikidata tag
}

export interface PlaceDetail extends Place {
  imageUrls: string[];
}
