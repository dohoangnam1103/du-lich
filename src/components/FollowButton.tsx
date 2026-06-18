"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const t = useT();

  async function toggle() {
    if (!session?.user) {
      signIn("google");
      return;
    }
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch(`/api/follows/${targetUserId}`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`glass-btn${following ? "" : " glass-btn-primary"}`}
      onClick={toggle}
      disabled={busy}
      style={{ marginTop: 10 }}
    >
      {following ? t("profile.following") : t("profile.follow")}
    </button>
  );
}
