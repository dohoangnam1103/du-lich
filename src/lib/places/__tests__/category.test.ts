import { describe, it, expect } from "vitest";
import { CATEGORIES, osmTagsForCategory } from "@/lib/places/types";

describe("osmTagsForCategory", () => {
  it("maps food to restaurant tags", () => {
    expect(osmTagsForCategory("food")).toContainEqual(["amenity", "restaurant"]);
  });
  it("maps cafe to cafe tag", () => {
    expect(osmTagsForCategory("cafe")).toContainEqual(["amenity", "cafe"]);
  });
  it("maps fun to leisure/tourism tags", () => {
    expect(osmTagsForCategory("fun")).toContainEqual(["leisure", "park"]);
  });
  it("maps sightseeing to tourism/historic tags", () => {
    expect(osmTagsForCategory("sightseeing")).toContainEqual(["tourism", "museum"]);
  });
  it("lists the core categories plus the extended ones", () => {
    expect(CATEGORIES).toEqual([
      "food",
      "cafe",
      "fun",
      "sightseeing",
      "hotel",
      "atm",
      "fuel",
      "health",
      "shopping",
    ]);
  });
  it("maps extended categories to OSM tags", () => {
    expect(osmTagsForCategory("hotel")).toContainEqual(["tourism", "hotel"]);
    expect(osmTagsForCategory("fuel")).toContainEqual(["amenity", "fuel"]);
    expect(osmTagsForCategory("health")).toContainEqual(["amenity", "pharmacy"]);
  });
});
