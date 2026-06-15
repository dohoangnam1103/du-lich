"use client";

import type { Vehicle } from "@/lib/vehicle";

const ITEMS: { value: Vehicle; label: string; icon: string }[] = [
  { value: "walk", label: "Đi bộ", icon: "🚶" },
  { value: "motorbike", label: "Xe máy", icon: "🛵" },
  { value: "car", label: "Ô tô", icon: "🚗" },
];

export function VehicleToggle({
  value,
  onChange,
}: {
  value: Vehicle;
  onChange: (v: Vehicle) => void;
}) {
  return (
    <div className="glass glass-edge" style={{ display: "flex", gap: 4, padding: 4 }}>
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.value)}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              borderRadius: 16,
              padding: "10px 8px",
              color: "var(--text)",
              background: active ? "rgba(255,255,255,0.25)" : "transparent",
              fontSize: 14,
            }}
          >
            <span style={{ fontSize: 18 }}>{it.icon}</span> {it.label}
          </button>
        );
      })}
    </div>
  );
}
