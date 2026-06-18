"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

export function FavoriteButton({
  placeId,
  initial,
  placeName,
  lat,
  lng,
}: {
  placeId: string;
  initial: boolean;
  placeName?: string;
  lat?: number;
  lng?: number;
}) {
  const { data: session } = useSession();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const t = useT();

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
          body: JSON.stringify({ placeId, placeName, lat, lng }),
        });
        if (res.ok) setFav(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`glass-btn${fav ? " glass-btn-primary" : ""}`}
      onClick={toggle}
      disabled={busy}
    >
      {fav ? t("place.saved") : t("place.save")}
    </button>
  );
}
