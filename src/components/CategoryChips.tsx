"use client";

import type { Category } from "@/lib/places/types";
import { useT } from "@/components/I18nProvider";

const ITEMS: { value: Category; key: string }[] = [
  { value: "food", key: "cat.food" },
  { value: "cafe", key: "cat.cafe" },
  { value: "fun", key: "cat.fun" },
  { value: "sightseeing", key: "cat.sightseeing" },
  { value: "hotel", key: "cat.hotel" },
  { value: "atm", key: "cat.atm" },
  { value: "fuel", key: "cat.fuel" },
  { value: "health", key: "cat.health" },
  { value: "shopping", key: "cat.shopping" },
];

export function CategoryChips({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}) {
  const t = useT();
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.value)}
            className={`chip${active ? " is-active" : ""}`}
          >
            {t(it.key)}
          </button>
        );
      })}
    </div>
  );
}
