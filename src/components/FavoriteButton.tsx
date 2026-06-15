"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export function FavoriteButton({
  placeId,
  initial,
}: {
  placeId: string;
  initial: boolean;
}) {
  const { data: session } = useSession();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!session?.user) {
      signIn("google");
      return;
    }
    setBusy(true);
    try {
      if (fav) {
        const res = await fetch(`/api/favorites/${encodeURIComponent(placeId)}`, {
          method: "DELETE",
        });
        if (res.ok) setFav(false);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        });
        if (res.ok) setFav(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="glass-btn" onClick={toggle} disabled={busy}>
      {fav ? "❤️ Đã lưu" : "🤍 Lưu địa điểm"}
    </button>
  );
}
