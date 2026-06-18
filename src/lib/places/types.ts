export const CATEGORIES = [
  "food",
  "cafe",
  "fun",
  "sightseeing",
  "hotel",
  "atm",
  "fuel",
  "health",
  "shopping",
] as const;
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
  hotel: [
    ["tourism", "hotel"],
    ["tourism", "guest_house"],
    ["tourism", "hostel"],
  ],
  atm: [
    ["amenity", "atm"],
    ["amenity", "bank"],
  ],
  fuel: [["amenity", "fuel"]],
  health: [
    ["amenity", "hospital"],
    ["amenity", "clinic"],
    ["amenity", "pharmacy"],
  ],
  shopping: [
    ["shop", "supermarket"],
    ["shop", "mall"],
    ["amenity", "marketplace"],
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
  openingHours?: string; // raw OSM opening_hours spec, used for the "open now" badge/filter
  rating?: number; // average community rating (1..5), filled by the API layer
  ratingCount?: number; // number of community reviews
}

export interface PlaceDetail extends Place {
  imageUrls: string[];
  description?: string; // Wikipedia extract when the POI has a wikipedia/wikidata tag
  wikiUrl?: string; // Link to the source Wikipedia article
  phone?: string; // OSM phone / contact:phone
  website?: string; // OSM website / contact:website, or Wikidata official site (P856)
  openingHours?: string; // OSM opening_hours (raw spec string)
  cuisine?: string; // OSM cuisine tag (e.g. "vietnamese;coffee_shop")
  facebook?: string; // OSM contact:facebook
}
