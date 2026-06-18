"use client";

import Link from "next/link";
import Image from "next/image";
import type { Category, Place } from "@/lib/places/types";
import { isOpenNow } from "@/lib/openingHours";
import { useT } from "@/components/I18nProvider";

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
  hotel: "🏨",
  atm: "🏧",
  fuel: "⛽",
  health: "🏥",
  shopping: "🛒",
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
  const t = useT();

  const query = userCoords
    ? `?lat=${userCoords.lat}&lng=${userCoords.lng}`
    : "";
  const href = `/place/${encodeURIComponent(place.placeId)}${query}`;

  const openState = isOpenNow(place.openingHours);
  const openLabel =
    openState === "open" ? t("place.openNow") : openState === "closed" ? t("place.closed") : null;

  return (
    <Link href={href} className="card-link">
      <div className="glass glass-edge place-card">
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            flex: "0 0 auto",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            background: "linear-gradient(135deg, rgba(91,124,255,0.18), rgba(155,92,255,0.18))",
          }}
        >
          {photoSrc ? (
            <Image
              src={photoSrc}
              alt={place.name}
              fill
              sizes="84px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            fallbackIcon
          )}
        </div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{place.name}</div>
          {place.address && (
            <div
              style={{
                color: "var(--text-dim)",
                fontSize: 13,
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {place.address}
            </div>
          )}
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--accent-1)",
                background: "rgba(91,124,255,0.12)",
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              📍 {formatDistance(place.distanceMeters)}
            </span>
            {place.rating != null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#b8860b",
                  background: "rgba(255,193,7,0.16)",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                ⭐ {place.rating.toFixed(1)}
                {place.ratingCount ? ` (${place.ratingCount})` : ""}
              </span>
            )}
            {openLabel && (
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: openState === "open" ? "#1a8f4c" : "#c0392b",
                  background:
                    openState === "open"
                      ? "rgba(26,143,76,0.14)"
                      : "rgba(192,57,43,0.12)",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {openLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
