import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { GET } from "@/app/api/places/photo/route";

function makeRequest(qs: string) {
  return new Request(`http://localhost/api/places/photo?${qs}`);
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
});

const VALID_NAME = "places/ChIJ_abc-123/photos/Aap_xyz-789";

describe("GET /api/places/photo", () => {
  it("400s when name is missing", async () => {
    const res = await GET(makeRequest("w=800"));
    expect(res.status).toBe(400);
  });

  it("400s when name has an invalid shape (path traversal)", async () => {
    const res = await GET(
      makeRequest(`name=${encodeURIComponent("places/../../etc")}`),
    );
    expect(res.status).toBe(400);
  });

  it("400s when name targets a different host / extra segments", async () => {
    const res = await GET(
      makeRequest(
        `name=${encodeURIComponent("places/abc/photos/def/extra")}`,
      ),
    );
    expect(res.status).toBe(400);
  });

  it("400s when w is present but non-numeric", async () => {
    const res = await GET(
      makeRequest(`name=${encodeURIComponent(VALID_NAME)}&w=abc`),
    );
    expect(res.status).toBe(400);
  });

  it("400s when w is out of range (too large)", async () => {
    const res = await GET(
      makeRequest(`name=${encodeURIComponent(VALID_NAME)}&w=5000`),
    );
    expect(res.status).toBe(400);
  });

  it("400s when w is zero or negative", async () => {
    const res = await GET(
      makeRequest(`name=${encodeURIComponent(VALID_NAME)}&w=0`),
    );
    expect(res.status).toBe(400);
  });

  it("streams the upstream photo on the success path", async () => {
    const fakeBody = new ReadableStream();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(fakeBody, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest(`name=${encodeURIComponent(VALID_NAME)}`));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain(`/v1/${VALID_NAME}/media`);
    expect(calledUrl).toContain("key=test-key");
    expect(calledUrl).toContain("maxWidthPx=800");
  });

  it("502s when the upstream fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest(`name=${encodeURIComponent(VALID_NAME)}`));
    expect(res.status).toBe(502);
  });
});
