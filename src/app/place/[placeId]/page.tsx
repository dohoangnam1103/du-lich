import Link from "next/link";
import { headers } from "next/headers";
import type { PlaceDetail } from "@/lib/places/types";

async function fetchDetail(placeId: string): Promise<PlaceDetail | null> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/places/${placeId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.place as PlaceDetail;
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const place = await fetchDetail(placeId);

  if (!place) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <Link href="/">← Quay lại</Link>
        <p style={{ marginTop: 24 }}>Không tải được thông tin địa điểm.</p>
      </main>
    );
  }

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
        <p style={{ color: "var(--text-dim)" }}>Sắp có (Plan 2).</p>
      </section>
    </main>
  );
}
