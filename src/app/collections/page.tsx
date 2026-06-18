"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

type CollectionSummary = {
  id: string;
  name: string;
  itemCount: number;
};

export default function CollectionsPage() {
  const { status } = useSession();
  const t = useT();
  const [items, setItems] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const res = await fetch("/api/collections");
    if (res.ok) {
      const body = await res.json();
      setItems(body.collections ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    refresh();
  }, [status]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setName("");
        await refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{t("col.title")}</h1>

      {status === "unauthenticated" && (
        <div className="glass glass-edge" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>{t("col.loginPrompt")}</p>
          <button className="glass-btn glass-btn-primary" onClick={() => signIn("google")}>
            {t("auth.loginGoogle")}
          </button>
        </div>
      )}

      {status === "authenticated" && (
        <>
          <form onSubmit={create} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              className="field"
              value={name}
              placeholder={t("col.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="glass-btn glass-btn-primary" disabled={creating}>
              {t("col.create")}
            </button>
          </form>

          {loading && (
            <div style={{ display: "flex", gap: 10, color: "var(--text-dim)" }}>
              <span className="spinner" /> {t("common.loading")}
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="muted">{t("col.empty")}</p>
          )}

          {items.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="card-link">
              <div className="glass glass-edge place-card" style={{ alignItems: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    flex: "0 0 auto",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                    background: "var(--surface-2)",
                  }}
                >
                  🗺️
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {c.itemCount} {t("col.places")}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </>
      )}
    </main>
  );
}
