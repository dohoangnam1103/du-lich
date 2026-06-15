import { describe, it, expect, vi } from "vitest";
import { searchNearby } from "@/lib/places/client";

function fakeFetch(jsonBody: unknown) {
  return vi.fn(async (..._args: Parameters<typeof fetch>) =>
    new Response(JSON.stringify(jsonBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

const sampleResponse = {
  places: [
    {
      id: "place_a",
      displayName: { text: "Quán A" },
      formattedAddress: "1 Đường A",
      location: { latitude: 10.78, longitude: 106.69 },
      rating: 4.5,
      userRatingCount: 120,
      photos: [{ name: "places/place_a/photos/xyz" }],
    },
  ],
};

describe("searchNearby", () => {
  it("normalizes Google response into Place[] and computes distance", async () => {
    const fetchImpl = fakeFetch(sampleResponse);
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, includedTypes: ["restaurant"] },
      { apiKey: "k", fetchImpl },
    );
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      placeId: "place_a",
      name: "Quán A",
      rating: 4.5,
      userRatingCount: 120,
      photoName: "places/place_a/photos/xyz",
    });
    expect(places[0].distanceMeters).toBe(0);
  });

  it("sorts results near to far", async () => {
    const far = {
      places: [
        {
          id: "far",
          displayName: { text: "Far" },
          location: { latitude: 10.9, longitude: 106.9 },
        },
        {
          id: "near",
          displayName: { text: "Near" },
          location: { latitude: 10.781, longitude: 106.691 },
        },
      ],
    };
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 50000, includedTypes: ["restaurant"] },
      { apiKey: "k", fetchImpl: fakeFetch(far) },
    );
    expect(places.map((p) => p.placeId)).toEqual(["near", "far"]);
  });

  it("sends apiKey and field mask in headers", async () => {
    const fetchImpl = fakeFetch(sampleResponse);
    await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, includedTypes: ["restaurant"] },
      { apiKey: "secret", fetchImpl },
    );
    const [, init] = fetchImpl.mock.calls[0];
    const headers = init!.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("secret");
    expect(headers["X-Goog-FieldMask"]).toContain("places.id");
  });

  it("throws on non-ok response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 403 }));
    await expect(
      searchNearby(
        { lat: 1, lng: 1, radiusMeters: 1000, includedTypes: ["restaurant"] },
        { apiKey: "k", fetchImpl },
      ),
    ).rejects.toThrow(/places api/i);
  });
});
