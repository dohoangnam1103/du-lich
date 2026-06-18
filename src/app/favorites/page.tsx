"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

type Favorite = {
  placeId: string;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
};

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const t = useT();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) return;
        const body = await res.json();
        if (active) setItems(body.favorites ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{t("fav.title")}</h1>

      {status === "unauthenticated" && (
        <div className="glass glass-edge" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>{t("fav.loginPrompt")}</p>
          <button className="glass-btn glass-btn-primary" onClick={() => signIn("google")}>
            {t("auth.loginGoogle")}
          </button>
        </div>
      )}

      {status === "authenticated" && loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-dim)" }}>
          <span className="spinner" /> {t("common.loading")}
        </div>
      )}

      {status === "authenticated" && !loading && items.length === 0 && (
        <p className="muted">{t("fav.empty")}</p>
      )}

      {items.map((f) => {
        const q =
          f.lat != null && f.lng != null ? `?lat=${f.lat}&lng=${f.lng}` : "";
        return (
          <Link
            key={f.placeId}
            href={`/place/${encodeURIComponent(f.placeId)}${q}`}
            className="card-link"
          >
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
                📍
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{f.placeName ?? t("fav.savedPlace")}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {t("common.viewDetail")}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </main>
  );
}
