"use client";

import type { Vehicle } from "@/lib/vehicle";
import { useT } from "@/components/I18nProvider";

const ITEMS: { value: Vehicle; key: string; icon: string }[] = [
  { value: "walk", key: "vehicle.walk", icon: "🚶" },
  { value: "motorbike", key: "vehicle.motorbike", icon: "🛵" },
  { value: "car", key: "vehicle.car", icon: "🚗" },
];

export function VehicleToggle({
  value,
  onChange,
}: {
  value: Vehicle;
  onChange: (v: Vehicle) => void;
}) {
  const t = useT();
  return (
    <div className="glass glass-edge segmented">
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.value)}
            className={`segmented-item${active ? " is-active" : ""}`}
          >
            <span className="seg-icon">{it.icon}</span> {t(it.key)}
          </button>
        );
      })}
    </div>
  );
}
