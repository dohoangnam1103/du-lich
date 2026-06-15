import { describe, it, expect, vi } from "vitest";
import { getPlaceDetail } from "@/lib/places/client";

function overpassResponse(elements: unknown[], status = 200) {
  return new Response(JSON.stringify({ elements }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const detailElement = {
  type: "node",
  id: 123,
  lat: 10.78,
  lon: 106.69,
  tags: {
    name: "Quán A",
    "addr:housenumber": "1",
    "addr:street": "Đường A",
    wikipedia: "vi:Quán A",
  },
};

describe("getPlaceDetail", () => {
  it("normalizes detail and pulls a Wikipedia image", async () => {
    const fetchImpl = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
      if (String(url).includes("wikipedia.org")) {
        return new Response(
          JSON.stringify({
            query: {
              pages: {
                "1": { title: "Quán A", thumbnail: { source: "https://img/a.jpg" } },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return overpassResponse([detailElement]);
    });
    const detail = await getPlaceDetail("node/123", { fetchImpl });
    expect(detail.placeId).toBe("node/123");
    expect(detail.name).toBe("Quán A");
    expect(detail.address).toBe("1, Đường A");
    expect(detail.imageUrls).toEqual(["https://img/a.jpg"]);
    expect(detail.imageUrl).toBe("https://img/a.jpg");
  });

  it("sends the element type+id in the Overpass query", async () => {
    const fetchImpl = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      overpassResponse([detailElement]),
    );
    await getPlaceDetail("node/123", { fetchImpl });
    const [, init] = fetchImpl.mock.calls[0];
    expect(decodeURIComponent(String(init!.body))).toContain("node(123)");
  });

  it("throws on an invalid placeId", async () => {
    const fetchImpl = vi.fn(async () => overpassResponse([detailElement]));
    await expect(getPlaceDetail("garbage", { fetchImpl })).rejects.toThrow(/invalid placeid/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws on non-ok response", async () => {
    const fetchImpl = vi.fn(async () => overpassResponse([], 504));
    await expect(getPlaceDetail("node/123", { fetchImpl })).rejects.toThrow(/overpass/i);
  });

  it("throws when the place is not found", async () => {
    const fetchImpl = vi.fn(async () => overpassResponse([]));
    await expect(getPlaceDetail("node/999", { fetchImpl })).rejects.toThrow(/not found/i);
  });
});
