import Link from "next/link";
import type { Category, Place } from "@/lib/places/types";

function formatDistance(m?: number): string {
  if (m == null) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

const CATEGORY_ICON: Record<Category, string> = {
  food: "🍜",
  cafe: "☕",
  fun: "🎡",
  sightseeing: "🏛️",
};

export function PlaceCard({
  place,
  userCoords,
  category,
}: {
  place: Place;
  userCoords?: { lat: number; lng: number };
  category?: Category;
}) {
  const photoSrc = place.imageUrl ?? null;
  const fallbackIcon = category ? CATEGORY_ICON[category] : "📍";

  const query = userCoords
    ? `?lat=${userCoords.lat}&lng=${userCoords.lng}`
    : "";
  const href = `/place/${encodeURIComponent(place.placeId)}${query}`;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="glass glass-edge" style={{ display: "flex", gap: 12, padding: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            background: photoSrc ? `center/cover url(${photoSrc})` : "rgba(255,255,255,0.15)",
          }}
        >
          {!photoSrc && fallbackIcon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{place.name}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
            {place.address}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 12 }}>
            <span>📍 {formatDistance(place.distanceMeters)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
