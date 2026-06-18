"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export function EditProfile({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const t = useT();

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className="glass-btn" onClick={() => setEditing(true)} style={{ marginTop: 10 }}>
        {t("profile.edit")}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <input
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("profile.displayName")}
      />
      <button type="button" className="glass-btn glass-btn-primary" onClick={save} disabled={busy}>
        {t("common.save")}
      </button>
      <button
        type="button"
        className="glass-btn"
        onClick={() => {
          setName(currentName);
          setEditing(false);
        }}
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}
