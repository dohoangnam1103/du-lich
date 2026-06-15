import { z } from "zod";

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

export const reviewSchema = z.object({
  placeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export const favoriteSchema = z.object({
  placeId: z.string().min(1),
});
