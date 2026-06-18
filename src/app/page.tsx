"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { VehicleToggle } from "@/components/VehicleToggle";
import { CategoryChips } from "@/components/CategoryChips";
import { PlaceCard } from "@/components/PlaceCard";
import { LocationSearch } from "@/components/LocationSearch";
import { MapView, type MapMarker } from "@/components/MapView";
import { PlaceCardSkeletonList } from "@/components/PlaceCardSkeleton";
import type { Vehicle } from "@/lib/vehicle";
import type { Category, Place } from "@/lib/places/types";
import { isOpenNow } from "@/lib/openingHours";
import { getRecent, type RecentPlace } from "@/lib/recent";
import { useT } from "@/components/I18nProvider";

type Coords = { lat: number; lng: number };
type SortMode = "distance" | "rating";

export default function Home() {
  const t = useT();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>("motorbike");
  const [category, setCategory] = useState<Category>("food");
  const [places, setPlaces] = useState<Place[]>([]);
  const [radiusMeters, setRadiusMeters] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters / sort / view.
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [hasPhotoOnly, setHasPhotoOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [view, setView] = useState<"list" | "map">("list");

  // Name search.
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [recent, setRecent] = useState<RecentPlace[]>([]);
  const [popular, setPopular] = useState<{ placeId: string; placeName: string | null }[]>([]);

  useEffect(() => {
    setRecent(getRecent());
    fetch("/api/places/popular")
      .then((r) => (r.ok ? r.json() : { places: [] }))
      .then((b) => setPopular(b.places ?? []))
      .catch(() => {});
    if (!("geolocation" in navigator)) {
      setGeoError(t("home.geoUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(t("home.geoDenied")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!coords) return;
      setLoading(true);
      setPlaces([]);
      try {
        const qs = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng),
          vehicle,
          category,
        });
        const res = await fetch(`/api/places/nearby?${qs}`, { signal });
        const body = await res.json();
        setPlaces(body.places ?? []);
        setRadiusMeters(body.radiusMeters ?? null);
        setExpanded(Boolean(body.expanded));
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setPlaces([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [coords, vehicle, category],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // Debounced name search against the current location.
  useEffect(() => {
    const term = nameQuery.trim();
    if (term.length < 2 || !coords) {
      setNameResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const qs = new URLSearchParams({
          q: term,
          lat: String(coords.lat),
          lng: String(coords.lng),
        });
        const res = await fetch(`/api/places/search?${qs}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const body = await res.json();
        setNameResults(body.places ?? []);
      } catch {
        /* aborted */
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [nameQuery, coords]);

  const searchActive = nameQuery.trim().length >= 2;
  const source = searchActive ? nameResults ?? [] : places;

  const visible = useMemo(() => {
    let list = source;
    if (openNowOnly) list = list.filter((p) => isOpenNow(p.openingHours) === "open");
    if (hasPhotoOnly) list = list.filter((p) => !!p.imageUrl);
    const sorted = [...list];
    if (sortMode === "rating") {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      sorted.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    }
    return sorted;
  }, [source, openNowOnly, hasPhotoOnly, sortMode]);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = visible.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      label: p.name,
      href: `/place/${encodeURIComponent(p.placeId)}?lat=${coords?.lat}&lng=${coords?.lng}`,
    }));
    if (coords) list.unshift({ ...coords, label: "Vị trí của bạn", primary: true });
    return list;
  }, [visible, coords]);

  const busy = searchActive ? searching : loading;
  // Waiting for geolocation to resolve (no coords yet, no error yet).
  const locating = !coords && !geoError && !searchActive;
  const showSkeleton = busy || locating;

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 16px" }}>{t("home.title")}</h1>

      <LocationSearch
        currentLabel={areaLabel}
        onPick={(r) => {
          setCoords({ lat: r.lat, lng: r.lng });
          setAreaLabel(r.name);
          setGeoError(null);
        }}
        onUseGps={() => {
          setAreaLabel(null);
          navigator.geolocation?.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setGeoError(t("home.geoDeniedShort")),
          );
        }}
      />

      <input
        className="field"
        value={nameQuery}
        placeholder={t("home.searchName")}
        onChange={(e) => setNameQuery(e.target.value)}
        style={{ marginTop: 10 }}
      />

      {!searchActive && (
        <>
          <div style={{ margin: "12px 0" }}>
            <VehicleToggle value={vehicle} onChange={setVehicle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <CategoryChips value={category} onChange={setCategory} />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, margin: "12px 0 16px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`chip${openNowOnly ? " is-active" : ""}`}
          aria-pressed={openNowOnly}
          onClick={() => setOpenNowOnly((v) => !v)}
        >
          {t("home.openNow")}
        </button>
        <button
          type="button"
          className={`chip${hasPhotoOnly ? " is-active" : ""}`}
          aria-pressed={hasPhotoOnly}
          onClick={() => setHasPhotoOnly((v) => !v)}
        >
          {t("home.hasPhoto")}
        </button>
        <button
          type="button"
          className={`chip${sortMode === "rating" ? " is-active" : ""}`}
          aria-pressed={sortMode === "rating"}
          onClick={() => setSortMode((m) => (m === "rating" ? "distance" : "rating"))}
        >
          {sortMode === "rating" ? t("home.sortRating") : t("home.sortDistance")}
        </button>
        <button
          type="button"
          className={`chip${view === "map" ? " is-active" : ""}`}
          aria-pressed={view === "map"}
          onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
        >
          {view === "map" ? t("home.viewList") : t("home.viewMap")}
        </button>
      </div>

      {geoError && (
        <div className="glass glass-edge" style={{ padding: 16, marginBottom: 16 }}>
          {geoError}
        </div>
      )}

      {!searchActive && !busy && popular.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ fontSize: 15 }}>{t("home.popular")}</h2>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {popular.map((p) => (
              <Link
                key={p.placeId}
                href={`/place/${encodeURIComponent(p.placeId)}`}
                className="glass glass-edge"
                style={{
                  flex: "0 0 auto",
                  maxWidth: 180,
                  padding: "8px 12px",
                  borderRadius: 999,
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                🔥 {p.placeName ?? t("col.fallback")}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!searchActive && !busy && recent.length > 0 && places.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ fontSize: 15 }}>{t("home.recent")}</h2>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {recent.map((r) => (
              <Link
                key={r.placeId}
                href={`/place/${encodeURIComponent(r.placeId)}`}
                className="glass glass-edge"
                style={{
                  flex: "0 0 auto",
                  maxWidth: 160,
                  padding: "8px 12px",
                  borderRadius: 999,
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                📍 {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {showSkeleton && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--text-dim)",
              padding: "8px 0 4px",
            }}
          >
            <span className="spinner" />
            {locating
              ? t("home.locating")
              : searchActive
                ? t("common.searching")
                : t("common.loading")}
          </div>
          <PlaceCardSkeletonList count={5} />
        </>
      )}

      {!showSkeleton && !searchActive && expanded && places.length > 0 && radiusMeters && (
        <p style={{ color: "var(--text-dim)", marginBottom: 8 }}>
          {t("home.expanded")} {(radiusMeters / 1000).toFixed(0)} km.
        </p>
      )}

      {!showSkeleton && coords && visible.length === 0 && (
        <p style={{ color: "var(--text-dim)" }}>
          {searchActive
            ? `${t("home.emptySearch")} "${nameQuery.trim()}".`
            : openNowOnly || hasPhotoOnly
              ? t("home.emptyFilter")
              : `${t("home.emptyRadius")} ${
                  radiusMeters ? `${(radiusMeters / 1000).toFixed(0)} km` : ""
                }.`}
        </p>
      )}

      {!showSkeleton && view === "map" && visible.length > 0 && <MapView markers={markers} />}

      {!showSkeleton &&
        view === "list" &&
        visible.map((p) => (
          <PlaceCard
            key={p.placeId}
            place={p}
            userCoords={coords ?? undefined}
            category={searchActive ? undefined : category}
          />
        ))}
    </main>
  );
}
