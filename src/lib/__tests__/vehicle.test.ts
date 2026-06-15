import { describe, it, expect } from "vitest";
import { radiusForVehicle, VEHICLES, type Vehicle } from "@/lib/vehicle";

describe("radiusForVehicle", () => {
  it("maps walk to 1000m", () => {
    expect(radiusForVehicle("walk")).toBe(1000);
  });
  it("maps motorbike to 5000m", () => {
    expect(radiusForVehicle("motorbike")).toBe(5000);
  });
  it("maps car to 15000m", () => {
    expect(radiusForVehicle("car")).toBe(15000);
  });
  it("falls back to motorbike radius for unknown values", () => {
    expect(radiusForVehicle("rocket" as Vehicle)).toBe(5000);
  });
  it("exposes the list of supported vehicles", () => {
    expect(VEHICLES).toEqual(["walk", "motorbike", "car"]);
  });
});
