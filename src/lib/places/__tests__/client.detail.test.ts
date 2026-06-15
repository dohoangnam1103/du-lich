import { describe, it, expect, vi } from "vitest";
import { getPlaceDetail } from "@/lib/places/client";

const detailResponse = {
  id: "place_a",
  displayName: { text: "Quán A" },
  formattedAddress: "1 Đường A",
  location: { latitude: 10.78, longitude: 106.69 },
  rating: 4.5,
  userRatingCount: 120,
  photos: [{ name: "places/place_a/photos/p1" }, { name: "places/place_a/photos/p2" }],
  reviews: [
    {
      authorAttribution: { displayName: "Nguyễn A", uri: "https://maps.google.com/x" },
      rating: 5,
      text: { text: "Ngon!" },
      relativePublishTimeDescription: "2 tuần trước",
    },
  ],
};

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("getPlaceDetail", () => {
  it("normalizes detail with reviews and photoNames", async () => {
    const detail = await getPlaceDetail("place_a", {
      apiKey: "k",
      fetchImpl: fakeFetch(detailResponse),
    });
    expect(detail.placeId).toBe("place_a");
    expect(detail.name).toBe("Quán A");
    expect(detail.photoNames).toEqual([
      "places/place_a/photos/p1",
      "places/place_a/photos/p2",
    ]);
    expect(detail.reviews).toHaveLength(1);
    expect(detail.reviews[0]).toMatchObject({
      authorName: "Nguyễn A",
      authorUri: "https://maps.google.com/x",
      rating: 5,
      text: "Ngon!",
      relativeTime: "2 tuần trước",
    });
  });

  it("calls the place-specific endpoint with the id", async () => {
    const fetchImpl = fakeFetch(detailResponse);
    await getPlaceDetail("place_a", { apiKey: "k", fetchImpl });
    const [url] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://places.googleapis.com/v1/places/place_a");
  });

  it("throws on non-ok", async () => {
    await expect(
      getPlaceDetail("x", { apiKey: "k", fetchImpl: fakeFetch("no", 404) }),
    ).rejects.toThrow(/places api/i);
  });
});
