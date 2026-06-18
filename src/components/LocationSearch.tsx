"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoResult } from "@/lib/places/geocode";
import { useT } from "@/components/I18nProvider";

export function LocationSearch({
  currentLabel,
  onPick,
  onUseGps,
}: {
  currentLabel: string | null;
  onPick: (r: GeoResult) => void;
  onUseGps: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Debounced geocoding as the user types.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const body = await res.json();
        setResults(body.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="field"
          value={q}
          placeholder={t("home.searchArea")}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        <button
          type="button"
          className="glass-btn"
          onClick={onUseGps}
          title="Dùng vị trí hiện tại"
        >
          📍
        </button>
      </div>

      {currentLabel && (
        <p className="muted" style={{ fontSize: 12.5, margin: "6px 2px 0" }}>
          {t("home.viewingAround")} {currentLabel}
        </p>
      )}

      {open && (results.length > 0 || loading) && (
        <div
          className="glass glass-edge"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 40,
            padding: 6,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {loading && <div className="muted" style={{ padding: 10, fontSize: 14 }}>{t("common.searching")}</div>}
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick(r);
                setQ("");
                setResults([]);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "10px 12px",
                borderRadius: 12,
                color: "var(--text)",
                fontSize: 14,
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
