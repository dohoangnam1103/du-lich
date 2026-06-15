import { describe, it, expect } from "vitest";
import { postSchema, commentSchema, reviewSchema } from "../validation";

describe("validation schemas", () => {
  it("accepts a valid post", () => {
    const r = postSchema.safeParse({
      caption: "Bún chả ngon",
      placeId: "abc",
      placeName: "Quán X",
      lat: 21.0,
      lng: 105.8,
      media: [{ url: "/uploads/a.jpg", type: "image" }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a post with no caption and no media", () => {
    const r = postSchema.safeParse({ caption: "", media: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a review rating outside 1..5", () => {
    expect(reviewSchema.safeParse({ placeId: "x", rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ placeId: "x", rating: 0 }).success).toBe(false);
  });

  it("accepts a valid review", () => {
    expect(
      reviewSchema.safeParse({ placeId: "x", rating: 4, body: "ổn" }).success,
    ).toBe(true);
  });

  it("rejects an empty comment", () => {
    expect(commentSchema.safeParse({ body: "" }).success).toBe(false);
  });
});
