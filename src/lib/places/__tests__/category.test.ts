import { describe, it, expect } from "vitest";
import { CATEGORIES, googleTypesForCategory, type Category } from "@/lib/places/types";

describe("googleTypesForCategory", () => {
  it("maps food to restaurant-ish types", () => {
    expect(googleTypesForCategory("food")).toContain("restaurant");
  });
  it("maps cafe to cafe", () => {
    expect(googleTypesForCategory("cafe")).toContain("cafe");
  });
  it("maps fun to entertainment types", () => {
    expect(googleTypesForCategory("fun")).toContain("amusement_park");
  });
  it("maps sightseeing to tourist_attraction", () => {
    expect(googleTypesForCategory("sightseeing")).toContain("tourist_attraction");
  });
  it("lists all four categories", () => {
    expect(CATEGORIES).toEqual(["food", "cafe", "fun", "sightseeing"]);
  });
});
