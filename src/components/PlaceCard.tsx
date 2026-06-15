import Link from "next/link";
import type { Place } from "@/lib/places/types";

function formatDistance(m?: number): string {
  if (m == null) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function PlaceCard({ place }: { place: Place }) {
  const photoSrc = place.photoName
    ? `/api/places/photo?name=${encodeURIComponent(place.photoName)}&w=400`
    : null;

  return (
    <Link href={`/place/${place.placeId}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="glass glass-edge" style={{ display: "flex", gap: 12, padding: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            flex: "0 0 auto",
            background: photoSrc ? `center/cover url(${photoSrc})` : "rgba(255,255,255,0.15)",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{place.name}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
            {place.address}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 12 }}>
            {place.rating != null && (
              <span>⭐ {place.rating} ({place.userRatingCount ?? 0})</span>
            )}
            <span>📍 {formatDistance(place.distanceMeters)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
