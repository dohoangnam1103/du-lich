import { describe, it, expect, vi } from "vitest";
import { searchNearby } from "@/lib/places/client";

function overpassResponse(elements: unknown[]) {
  return new Response(JSON.stringify({ elements }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const sampleElements = [
  {
    type: "node",
    id: 1,
    lat: 10.78,
    lon: 106.69,
    tags: { name: "Quán A", "addr:street": "Đường A" },
  },
];

describe("searchNearby", () => {
  it("normalizes Overpass response into Place[] and computes distance", async () => {
    const fetchImpl = vi.fn(async () => overpassResponse(sampleElements));
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, tagFilters: [["amenity", "restaurant"]] },
      { fetchImpl },
    );
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      placeId: "node/1",
      name: "Quán A",
      address: "Đường A",
    });
    expect(places[0].distanceMeters).toBe(0);
  });

  it("sorts results near to far", async () => {
    const elements = [
      { type: "node", id: 10, lat: 10.9, lon: 106.9, tags: { name: "Far" } },
      { type: "node", id: 11, lat: 10.781, lon: 106.691, tags: { name: "Near" } },
    ];
    const fetchImpl = vi.fn(async () => overpassResponse(elements));
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 50000, tagFilters: [["amenity", "restaurant"]] },
      { fetchImpl },
    );
    expect(places.map((p) => p.placeId)).toEqual(["node/11", "node/10"]);
  });

  it("skips elements without a name", async () => {
    const elements = [
      { type: "node", id: 1, lat: 10.78, lon: 106.69, tags: { name: "Có tên" } },
      { type: "node", id: 2, lat: 10.78, lon: 106.69, tags: { amenity: "restaurant" } },
    ];
    const fetchImpl = vi.fn(async () => overpassResponse(elements));
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, tagFilters: [["amenity", "restaurant"]] },
      { fetchImpl },
    );
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe("Có tên");
  });

  it("attaches Wikipedia image when the POI has a wikipedia tag", async () => {
    const elements = [
      {
        type: "node",
        id: 1,
        lat: 10.78,
        lon: 106.69,
        tags: { name: "Văn Miếu", wikipedia: "vi:Văn Miếu" },
      },
    ];
    const fetchImpl = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
      if (String(url).includes("wikipedia.org")) {
        return new Response(
          JSON.stringify({
            query: {
              pages: {
                "1": { title: "Văn Miếu", thumbnail: { source: "https://img/vm.jpg" } },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return overpassResponse(elements);
    });
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, tagFilters: [["tourism", "museum"]] },
      { fetchImpl },
    );
    expect(places[0].imageUrl).toBe("https://img/vm.jpg");
  });

  it("throws on non-ok response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 429 }));
    await expect(
      searchNearby(
        { lat: 1, lng: 1, radiusMeters: 1000, tagFilters: [["amenity", "restaurant"]] },
        { fetchImpl },
      ),
    ).rejects.toThrow(/overpass/i);
  });
});
