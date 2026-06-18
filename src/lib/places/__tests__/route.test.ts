import { describe, it, expect, vi } from "vitest";
import { getRoute } from "@/lib/places/route";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const points = [
  { lat: 10.78, lng: 106.69 },
  { lat: 10.8, lng: 106.7 },
];

describe("getRoute", () => {
  it("returns null when given fewer than 2 points", async () => {
    const fetchImpl = vi.fn();
    expect(await getRoute([{ lat: 1, lng: 1 }], { fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends lng,lat order and flips geometry to lat,lng", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code: "Ok",
        routes: [
          {
            distance: 1234.6,
            duration: 300.2,
            geometry: { coordinates: [[106.69, 10.78], [106.7, 10.8]] },
          },
        ],
      }),
    );
    const route = await getRoute(points, { fetchImpl });
    expect(route).not.toBeNull();
    expect(route!.distanceMeters).toBe(1235);
    expect(route!.durationSeconds).toBe(300);
    expect(route!.geometry).toEqual([[10.78, 106.69], [10.8, 106.7]]);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("106.69,10.78;106.7,10.8");
  });

  it("returns null when OSRM reports no route", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ code: "NoRoute", routes: [] }));
    expect(await getRoute(points, { fetchImpl })).toBeNull();
  });
});
