import Link from "next/link";
import { headers } from "next/headers";
import type { PlaceDetail } from "@/lib/places/types";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewForm } from "@/components/ReviewForm";
import { PostCard, type FeedPost } from "@/components/PostCard";

type CommunityReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  user: { displayName: string | null; avatarUrl: string | null };
};

type DetailResponse = {
  place: PlaceDetail;
  userPosts: FeedPost[];
  userReviews: CommunityReview[];
  isFavorite: boolean;
};

async function fetchDetail(placeId: string): Promise<DetailResponse | null> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/places/${placeId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as DetailResponse;
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
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

  const hero = place.photoNames[0]
    ? `/api/places/photo?name=${encodeURIComponent(place.photoNames[0])}&w=800`
    : null;

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <Link href="/" style={{ color: "var(--text-dim)" }}>← Quay lại</Link>

      {hero && (
        <div
          style={{
            height: 220,
            borderRadius: 22,
            margin: "12px 0",
            background: `center/cover url(${hero})`,
          }}
        />
      )}

      <h1 style={{ fontSize: 24, margin: "8px 0" }}>{place.name}</h1>
      {place.address && <p style={{ color: "var(--text-dim)" }}>{place.address}</p>}
      {place.rating != null && (
        <p>⭐ {place.rating} · {place.userRatingCount ?? 0} đánh giá (Google)</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <FavoriteButton placeId={placeId} initial={isFavorite} />
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
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Đánh giá từ Google</h2>
        {place.reviews.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>Chưa có đánh giá.</p>
        )}
        {place.reviews.map((r, i) => (
          <div key={i} className="glass glass-edge" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {r.authorUri ? (
                  <a href={r.authorUri} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
                    {r.authorName}
                  </a>
                ) : (
                  r.authorName
                )}
              </strong>
              <span>⭐ {r.rating}</span>
            </div>
            {r.relativeTime && (
              <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{r.relativeTime}</div>
            )}
            {r.text && <p style={{ marginTop: 6 }}>{r.text}</p>}
          </div>
        ))}
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 12 }}>
          Đánh giá &amp; ảnh được cung cấp bởi Google.
        </p>
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
