import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/places/client", () => ({
  searchNearby: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      posts: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

import { GET } from "@/app/api/places/nearby/route";
import { searchNearby } from "@/lib/places/client";

const mockedSearch = vi.mocked(searchNearby);

function makeRequest(qs: string) {
  return new Request(`http://localhost/api/places/nearby?${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/places/nearby", () => {
  it("400s when lat/lng missing", async () => {
    const res = await GET(makeRequest("vehicle=walk&category=food"));
    expect(res.status).toBe(400);
  });

  it("400s on invalid vehicle", async () => {
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=plane&category=food"));
    expect(res.status).toBe(400);
  });

  it("calls searchNearby with mapped radius + types and returns places", async () => {
    mockedSearch.mockResolvedValue([
      { placeId: "p1", name: "A", lat: 10, lng: 106, distanceMeters: 100 },
    ]);
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=motorbike&category=cafe"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places).toHaveLength(1);
    const arg = mockedSearch.mock.calls[0][0];
    expect(arg.radiusMeters).toBe(5000);
    expect(arg.tagFilters).toContainEqual(["amenity", "cafe"]);
  });

  it("500s when the client throws", async () => {
    mockedSearch.mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=walk&category=food"));
    expect(res.status).toBe(500);
  });
});
