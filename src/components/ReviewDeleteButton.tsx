"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export function ReviewDeleteButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const t = useT();

  async function remove() {
    if (!confirm(t("review.deleteConfirm"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label="Xoá review"
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        fontSize: 15,
        color: "var(--text-dim)",
      }}
    >
      🗑️
    </button>
  );
}
