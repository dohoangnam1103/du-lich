import { describe, it, expect } from "vitest";
import { pickExtension, isAllowedMime } from "../upload";

describe("upload guards", () => {
  it("maps known image/video mimes to extensions", () => {
    expect(pickExtension("image/jpeg")).toBe(".jpg");
    expect(pickExtension("image/png")).toBe(".png");
    expect(pickExtension("video/mp4")).toBe(".mp4");
  });

  it("rejects disallowed mimes", () => {
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("image/jpeg")).toBe(true);
  });
});
