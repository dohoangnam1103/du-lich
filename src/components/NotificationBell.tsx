"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function NotificationBell() {
  const { status } = useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const body = await res.json();
        if (active) setUnread(body.unread ?? 0);
      } catch {
        /* ignore */
      }
    }

    poll();
    const id = setInterval(poll, 30000); // poll every 30s
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <Link
      href="/notifications"
      aria-label="Thông báo"
      style={{ position: "relative", fontSize: 22, textDecoration: "none", lineHeight: 1 }}
    >
      🔔
      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -8,
            minWidth: 18,
            height: 18,
            padding: "0 4px",
            borderRadius: 999,
            background: "var(--ink)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
