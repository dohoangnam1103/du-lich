import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/geo";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(10.78, 106.69, 10.78, 106.69)).toBe(0);
  });
  it("computes a known distance within 1% tolerance", () => {
    const d = haversineMeters(10.7721, 106.698, 10.7773, 106.6953);
    expect(d).toBeGreaterThan(550);
    expect(d).toBeLessThan(750);
  });
});
