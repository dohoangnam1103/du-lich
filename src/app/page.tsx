"use client";

import { useEffect, useState, useCallback } from "react";
import { VehicleToggle } from "@/components/VehicleToggle";
import { CategoryChips } from "@/components/CategoryChips";
import { PlaceCard } from "@/components/PlaceCard";
import type { Vehicle } from "@/lib/vehicle";
import type { Category, Place } from "@/lib/places/types";

type Coords = { lat: number; lng: number };

export default function Home() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>("motorbike");
  const [category, setCategory] = useState<Category>("food");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Cần cho phép quyền vị trí để tìm địa điểm quanh đây."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        vehicle,
        category,
      });
      const res = await fetch(`/api/places/nearby?${qs}`);
      const body = await res.json();
      setPlaces(body.places ?? []);
    } finally {
      setLoading(false);
    }
  }, [coords, vehicle, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <h1 style={{ fontSize: 22, margin: "8px 0 16px" }}>Quanh đây</h1>

      <div style={{ marginBottom: 12 }}>
        <VehicleToggle value={vehicle} onChange={setVehicle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      {geoError && (
        <div className="glass glass-edge" style={{ padding: 16, marginBottom: 16 }}>
          {geoError}
        </div>
      )}

      {loading && <p style={{ color: "var(--text-dim)" }}>Đang tìm…</p>}

      {!loading && coords && places.length === 0 && (
        <p style={{ color: "var(--text-dim)" }}>Không tìm thấy địa điểm nào trong bán kính.</p>
      )}

      {places.map((p) => (
        <PlaceCard key={p.placeId} place={p} userCoords={coords ?? undefined} category={category} />
      ))}
    </main>
  );
}
