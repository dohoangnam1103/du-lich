import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/places/client", () => ({
  getPlaceDetail: vi.fn(),
}));

import { GET } from "@/app/api/places/[placeId]/route";
import { getPlaceDetail } from "@/lib/places/client";

const mockedDetail = vi.mocked(getPlaceDetail);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
});

function ctx(placeId: string) {
  return { params: Promise.resolve({ placeId }) };
}

describe("GET /api/places/[placeId]", () => {
  it("returns google detail plus empty user content", async () => {
    mockedDetail.mockResolvedValue({
      placeId: "p1",
      name: "A",
      lat: 10,
      lng: 106,
      reviews: [],
      photoNames: [],
    });
    const res = await GET(new Request("http://localhost/api/places/p1"), ctx("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.place.placeId).toBe("p1");
    expect(body.userPosts).toEqual([]);
    expect(body.userReviews).toEqual([]);
  });

  it("500s when the client throws", async () => {
    mockedDetail.mockRejectedValue(new Error("boom"));
    const res = await GET(new Request("http://localhost/api/places/p1"), ctx("p1"));
    expect(res.status).toBe(500);
  });
});
