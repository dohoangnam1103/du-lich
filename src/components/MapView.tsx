"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  lat: number;
  lng: number;
  label?: string;
  href?: string;
  primary?: boolean; // e.g. the user's own position
};

// Inline SVG pin so we don't depend on Leaflet's image assets (which break
// under bundlers). Two colors: accent for POIs, pink for the user.
function pinIconHtml(color: string): string {
  return (
    `<div style="transform:translate(-50%,-100%);font-size:28px;line-height:1;` +
    `filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));color:${color}">📍</div>`
  );
}

export function MapView({
  markers,
  polyline,
  height = 360,
}: {
  markers: MapMarker[];
  polyline?: [number, number][];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;

      const center: [number, number] = markers.length
        ? [markers[0].lat, markers[0].lng]
        : [10.7769, 106.7009]; // fallback: Ho Chi Minh City

      map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const m of markers) {
        const icon = L.divIcon({
          className: "",
          html: pinIconHtml(m.primary ? "#ff7eb6" : "#4f7cff"),
          iconSize: [28, 28],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.label) {
          const safe = m.label.replace(/</g, "&lt;");
          const popup = m.href
            ? `<a href="${m.href}" style="font-weight:600;color:#4f7cff">${safe}</a>`
            : `<strong>${safe}</strong>`;
          marker.bindPopup(popup);
        }
        bounds.push([m.lat, m.lng]);
      }

      if (polyline && polyline.length > 1) {
        L.polyline(polyline, { color: "#4f7cff", weight: 5, opacity: 0.85 }).addTo(map);
        for (const p of polyline) bounds.push(p);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [markers, polyline]);

  return <div ref={ref} className="map-shell" style={{ height }} />;
}
