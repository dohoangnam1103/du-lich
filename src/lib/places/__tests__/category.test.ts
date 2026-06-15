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
  it("lists all four categories", () => {
    expect(CATEGORIES).toEqual(["food", "cafe", "fun", "sightseeing"]);
  });
});
