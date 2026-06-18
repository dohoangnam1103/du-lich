"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { MapView, type MapMarker } from "@/components/MapView";
import { ShareButton } from "@/components/ShareButton";
import { useT } from "@/components/I18nProvider";

type Item = {
  placeId: string;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
};

type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][];
};

function fmtKm(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function fmtDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  return `${h} giờ ${mins % 60} phút`;
}

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/collections/${id}`);
    if (res.ok) {
      const body = await res.json();
      setName(body.collection?.name ?? "");
      setItems(body.items ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function removeItem(placeId: string) {
    const res = await fetch(
      `/api/collections/${id}/items/${encodeURIComponent(placeId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setItems((list) => list.filter((i) => i.placeId !== placeId));
      setRoute(null);
    }
  }

  // Persists the given item order (by placeId) to the server.
  async function persistOrder(ordered: Item[]) {
    await fetch(`/api/collections/${id}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ordered.map((i) => i.placeId) }),
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setRoute(null);
    persistOrder(next);
  }

  const located = items.filter((i) => i.lat != null && i.lng != null);

  async function buildRoute(optimize: boolean) {
    if (located.length < 2) return;
    setRouting(true);
    setRouteError(null);
    try {
      const points = located.map((i) => `${i.lat},${i.lng}`).join(";");
      const res = await fetch(
        `/api/route?points=${encodeURIComponent(points)}${optimize ? "&optimize=1" : ""}`,
      );
      if (!res.ok) {
        setRouteError(t("col.routeError"));
        return;
      }
      const body = await res.json();
      setRoute(body.route);

      // Apply optimized visiting order to the item list + persist it.
      if (optimize && Array.isArray(body.order)) {
        const reordered = (body.order as number[])
          .map((idx) => located[idx])
          .filter(Boolean);
        const rest = items.filter((i) => !reordered.includes(i));
        const next = [...reordered, ...rest];
        setItems(next);
        persistOrder(next);
      }
    } finally {
      setRouting(false);
    }
  }

  const markers: MapMarker[] = located.map((i) => ({
    lat: i.lat!,
    lng: i.lng!,
    label: i.placeName ?? t("col.fallback"),
    href: `/place/${encodeURIComponent(i.placeId)}`,
  }));

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <Link href="/collections" style={{ color: "var(--text-dim)" }}>← {t("col.title")}</Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "10px 0 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{name || t("col.fallback")}</h1>
        <ShareButton
          title={name || t("col.fallback")}
          url={typeof window !== "undefined" ? `${window.location.origin}/c/${id}` : undefined}
        />
      </div>

      {loading && (
        <div style={{ display: "flex", gap: 10, color: "var(--text-dim)" }}>
          <span className="spinner" /> {t("common.loading")}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="muted">{t("col.emptyItems")}</p>
      )}

      {markers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <MapView markers={markers} polyline={route?.geometry} />
        </div>
      )}

      {located.length >= 2 && (
        <div className="glass glass-edge" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="glass-btn"
              onClick={() => buildRoute(false)}
              disabled={routing}
            >
              {routing ? t("col.routing") : t("col.buildRoute")}
            </button>
            <button
              type="button"
              className="glass-btn glass-btn-primary"
              onClick={() => buildRoute(true)}
              disabled={routing}
            >
              {t("col.optimize")}
            </button>
          </div>
          {route && (
            <p style={{ marginTop: 10, fontWeight: 600 }}>
              {t("col.total")} {fmtKm(route.distanceMeters)} · ~{fmtDuration(route.durationSeconds)}
            </p>
          )}
          {routeError && <p style={{ color: "var(--danger)", marginTop: 8 }}>{routeError}</p>}
        </div>
      )}

      {items.map((i, idx) => (
        <div
          key={i.placeId}
          className="glass glass-edge place-card"
          style={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Link
            href={`/place/${encodeURIComponent(i.placeId)}`}
            className="card-link"
            style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}
          >
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
            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i.placeName ?? t("col.fallback")}
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "0 0 auto" }}>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              aria-label="Lên"
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "var(--text-dim)", opacity: idx === 0 ? 0.3 : 1, padding: 4 }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              aria-label="Xuống"
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "var(--text-dim)", opacity: idx === items.length - 1 ? 0.3 : 1, padding: 4 }}
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => removeItem(i.placeId)}
              aria-label="Xoá"
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--text-dim)", padding: 6 }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
