import { z } from "zod";

// True when the string is a valid UUID (defends server pages against malformed
// route params that would otherwise crash the Postgres query with a 500).
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const mediaSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["image", "video"]),
});

export const postSchema = z
  .object({
    caption: z.string().max(2000).optional().default(""),
    placeId: z.string().optional(),
    placeName: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    media: z.array(mediaSchema).max(10).default([]),
  })
  .refine((d) => d.caption.trim().length > 0 || d.media.length > 0, {
    message: "Post must have a caption or at least one media item",
  });

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export const postUpdateSchema = z.object({
  caption: z.string().max(2000),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export const reviewSchema = z.object({
  placeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
  media: z.array(mediaSchema).max(10).default([]),
});

export const favoriteSchema = z.object({
  placeId: z.string().min(1),
  placeName: z.string().max(300).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const collectionCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const collectionItemSchema = z.object({
  placeId: z.string().min(1),
  placeName: z.string().max(300).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
