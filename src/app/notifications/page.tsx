"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

type Actor = {
  id: string;
  displayName: string | null;
  name: string | null;
  avatarUrl: string | null;
  image: string | null;
};
type Notification = {
  id: string;
  type: "like" | "comment" | "follow";
  postId: string | null;
  read: boolean;
  createdAt: string;
  actor: Actor;
};

export default function NotificationsPage() {
  const { status } = useSession();
  const t = useT();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const VERB: Record<Notification["type"], string> = {
    like: t("notif.like"),
    comment: t("notif.comment"),
    follow: t("notif.follow"),
  };

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const body = await res.json();
          setItems(body.notifications ?? []);
          // Mark all as read once viewed.
          fetch("/api/notifications", { method: "POST" });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{t("notif.title")}</h1>

      {status === "unauthenticated" && (
        <div className="glass glass-edge" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>{t("notif.loginPrompt")}</p>
          <button className="glass-btn glass-btn-primary" onClick={() => signIn("google")}>
            {t("auth.loginGoogle")}
          </button>
        </div>
      )}

      {status === "authenticated" && loading && (
        <div style={{ display: "flex", gap: 10, color: "var(--text-dim)" }}>
          <span className="spinner" /> {t("common.loading")}
        </div>
      )}

      {status === "authenticated" && !loading && items.length === 0 && (
        <p className="muted">{t("notif.empty")}</p>
      )}

      {items.map((n) => {
        const name = n.actor.displayName ?? n.actor.name ?? t("notif.someone");
        const avatar = n.actor.avatarUrl ?? n.actor.image ?? null;
        const initial = name.trim().charAt(0).toUpperCase() || "?";
        const href = n.type === "follow" ? `/u/${n.actor.id}` : n.postId ? `/post/${n.postId}` : "#";
        return (
          <Link key={n.id} href={href} className="card-link">
            <div
              className="glass glass-edge place-card"
              style={{
                alignItems: "center",
                gap: 12,
                background: n.read ? undefined : "rgba(91,124,255,0.08)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  color: "#fff",
                  background: avatar ? `center/cover url(${avatar})` : "var(--accent-grad)",
                }}
              >
                {avatar ? "" : initial}
              </div>
              <div style={{ fontSize: 14 }}>
                <strong>{name}</strong> {VERB[n.type]}
              </div>
            </div>
          </Link>
        );
      })}
    </main>
  );
}
