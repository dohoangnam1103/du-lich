"use client";

import type { Category } from "@/lib/places/types";

const ITEMS: { value: Category; label: string }[] = [
  { value: "food", label: "Ăn uống" },
  { value: "cafe", label: "Cà phê" },
  { value: "fun", label: "Vui chơi" },
  { value: "sightseeing", label: "Tham quan" },
];

export function CategoryChips({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className="glass-edge"
            style={{
              flex: "0 0 auto",
              border: "1px solid var(--glass-border)",
              cursor: "pointer",
              borderRadius: 999,
              padding: "8px 16px",
              color: "var(--text)",
              background: active ? "rgba(255,255,255,0.3)" : "var(--glass-bg)",
              backdropFilter: "blur(12px)",
              fontSize: 14,
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
