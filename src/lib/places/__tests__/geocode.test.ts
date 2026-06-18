import { describe, it, expect, vi } from "vitest";
import { geocode } from "@/lib/places/geocode";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("geocode", () => {
  it("returns empty for blank queries without calling the network", async () => {
    const fetchImpl = vi.fn();
    expect(await geocode("  ", { fetchImpl })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes Nominatim results", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        { display_name: "Đà Lạt, Lâm Đồng", lat: "11.94", lon: "108.44" },
        { display_name: "bad", lat: "x", lon: "y" },
      ]),
    );
    const results = await geocode("Đà Lạt", { fetchImpl });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ name: "Đà Lạt, Lâm Đồng", lat: 11.94, lng: 108.44 });
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([], 500));
    await expect(geocode("x", { fetchImpl })).rejects.toThrow(/nominatim/i);
  });
});
