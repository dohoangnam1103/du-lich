import Link from "next/link";
import { headers } from "next/headers";
import type { PlaceDetail } from "@/lib/places/types";
import { haversineMeters } from "@/lib/geo";
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
  const res = await fetch(
    `${proto}://${host}/api/places/${encodeURIComponent(placeId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()) as DetailResponse;
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { placeId } = await params;
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

  const hero = place.imageUrls[0] ?? null;

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
