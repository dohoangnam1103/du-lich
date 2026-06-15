import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, postMedia } from "@/db/schema";
import { desc, lt } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { postSchema } from "@/lib/validation";

const PAGE = 10;

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor"); // ISO date of last seen
  const where = cursor ? lt(posts.createdAt, new Date(cursor)) : undefined;
  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.createdAt)],
    limit: PAGE + 1,
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.position)] },
      user: { columns: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const nextCursor = hasMore
    ? page[page.length - 1].createdAt.toISOString()
    : null;
  return NextResponse.json({ posts: page, nextCursor });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const [post] = await db
      .insert(posts)
      .values({
        userId: user.id,
        placeId: d.placeId,
        placeName: d.placeName,
        caption: d.caption,
        lat: d.lat,
        lng: d.lng,
      })
      .returning();

    if (d.media.length > 0) {
      await db.insert(postMedia).values(
        d.media.map((m, i) => ({
          postId: post.id,
          url: m.url,
          type: m.type,
          position: i,
        })),
      );
    }
    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
