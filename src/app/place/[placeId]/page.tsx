import Link from "next/link";
import type { PlaceDetail } from "@/lib/places/types";
import { haversineMeters } from "@/lib/geo";
import { getPlaceDetail } from "@/lib/places/client";
import { auth } from "@/auth";
import { db } from "@/db";
import { posts, reviews, favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewForm } from "@/components/ReviewForm";
import { PostCard, type FeedPost } from "@/components/PostCard";

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

type CommunityReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  media: { url: string; type: string }[];
  user: { displayName: string | null; avatarUrl: string | null };
};

type DetailResponse = {
  place: PlaceDetail;
  userPosts: FeedPost[];
  userReviews: CommunityReview[];
  isFavorite: boolean;
};

async function fetchDetail(placeId: string): Promise<DetailResponse | null> {
  try {
    const place = await getPlaceDetail(placeId);

    const userPosts = await db.query.posts.findMany({
      where: eq(posts.placeId, placeId),
      orderBy: [desc(posts.createdAt)],
      limit: 20,
      with: {
        media: { orderBy: (m, { asc }) => [asc(m.position)] },
        user: { columns: { displayName: true, avatarUrl: true } },
      },
    });

    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.placeId, placeId),
      orderBy: [desc(reviews.createdAt)],
      with: {
        media: { orderBy: (m, { asc }) => [asc(m.position)] },
        user: { columns: { displayName: true, avatarUrl: true } },
      },
    });

    const session = await auth();
    let isFavorite = false;
    if (session?.user?.id) {
      const fav = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, session.user.id),
          eq(favorites.placeId, placeId),
        ),
      });
      isFavorite = !!fav;
    }

    return {
      place,
      userPosts: userPosts as unknown as FeedPost[],
      userReviews: userReviews as unknown as CommunityReview[],
      isFavorite,
    };
  } catch {
    return null;
  }
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { placeId: rawPlaceId } = await params;
  const placeId = decodeURIComponent(rawPlaceId);
  const { lat, lng } = await searchParams;
  const data = await fetchDetail(placeId);

  if (!data) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <Link href="/">← Quay lại</Link>
        <p style={{ marginTop: 24 }}>Không tải được thông tin địa điểm.</p>
      </main>
    );
  }

  const { place, userPosts, userReviews, isFavorite } = data;

  const userLat = Number(lat);
  const userLng = Number(lng);
  const distanceMeters =
    Number.isFinite(userLat) && Number.isFinite(userLng)
      ? haversineMeters(userLat, userLng, place.lat, place.lng)
      : null;

  const gallery = [
    ...place.imageUrls,
    ...userReviews.flatMap((r) =>
      r.media.filter((m) => m.type === "image").map((m) => m.url),
    ),
    ...userPosts.flatMap((p) =>
      p.media.filter((m) => m.type === "image").map((m) => m.url),
    ),
  ];

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <Link href="/" style={{ color: "var(--text-dim)" }}>← Quay lại</Link>

      {gallery.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            margin: "12px 0",
            scrollSnapType: "x mandatory",
          }}
        >
          {gallery.map((url, i) => (
            <div
              key={i}
              style={{
                flex: gallery.length === 1 ? "1 0 100%" : "0 0 78%",
                height: 220,
                borderRadius: 22,
                background: `center/cover url(${url})`,
                scrollSnapAlign: "start",
              }}
            />
          ))}
        </div>
      )}

      <h1 style={{ fontSize: 24, margin: "8px 0" }}>{place.name}</h1>
      {place.address && <p style={{ color: "var(--text-dim)" }}>{place.address}</p>}
      {distanceMeters != null && (
        <p style={{ color: "var(--text-dim)" }}>📍 {formatDistance(distanceMeters)}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <FavoriteButton placeId={placeId} initial={isFavorite} />
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noreferrer"
          className="glass glass-edge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            textDecoration: "none",
            color: "inherit",
            fontSize: 14,
          }}
        >
          🧭 Chỉ đường
        </a>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Viết review</h2>
        <ReviewForm placeId={placeId} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Review cộng đồng</h2>
        {userReviews.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>Chưa có review nào.</p>
        )}
        {userReviews.map((r) => (
          <div key={r.id} className="glass glass-edge" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{r.user.displayName ?? "Ẩn danh"}</strong>
              <span>⭐ {r.rating}</span>
            </div>
            {r.body && <p style={{ marginTop: 6 }}>{r.body}</p>}
            {r.media.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {r.media
                  .filter((m) => m.type === "image")
                  .map((m, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={m.url}
                      alt=""
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }}
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Bài đăng cộng đồng</h2>
        {userPosts.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>Chưa có bài đăng nào.</p>
        )}
        {userPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </main>
  );
}
