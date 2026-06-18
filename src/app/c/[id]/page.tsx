import Link from "next/link";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { MapView, type MapMarker } from "@/components/MapView";
import { getT } from "@/lib/i18n/server";

// Public, read-only view of a collection. Anyone with the link can view it;
// no authentication required (this is the "share" target).
export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getT();

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, id),
  });

  if (!collection) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <p style={{ marginTop: 24 }}>{t("col.notFound")}</p>
        <Link href="/">{t("common.back")}</Link>
      </main>
    );
  }

  const items = await db.query.collectionItems.findMany({
    where: eq(collectionItems.collectionId, id),
    orderBy: [asc(collectionItems.position), asc(collectionItems.createdAt)],
  });

  const markers: MapMarker[] = items
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({
      lat: i.lat!,
      lng: i.lng!,
      label: i.placeName ?? t("col.fallback"),
      href: `/place/${encodeURIComponent(i.placeId)}`,
    }));

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 4px" }}>{collection.name}</h1>
      <p className="muted" style={{ marginBottom: 16 }}>{t("col.shareDesc")} · {items.length} {t("col.places")}</p>

      {markers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <MapView markers={markers} />
        </div>
      )}

      {items.map((i, idx) => (
        <Link
          key={i.placeId}
          href={`/place/${encodeURIComponent(i.placeId)}`}
          className="card-link"
        >
          <div className="glass glass-edge place-card" style={{ alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                color: "#fff",
                background: "var(--accent-grad)",
                flex: "0 0 auto",
              }}
            >
              {idx + 1}
            </span>
            <span style={{ fontWeight: 600 }}>{i.placeName ?? t("col.fallback")}</span>
          </div>
        </Link>
      ))}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/" className="glass-btn glass-btn-primary" style={{ textDecoration: "none" }}>
          {t("col.exploreMore")}
        </Link>
      </div>
    </main>
  );
}
