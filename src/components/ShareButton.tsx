"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

export function ShareButton({ title, url }: { title: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();

  async function share() {
    const shareUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // user cancelled or unsupported; fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" className="glass-btn" onClick={share}>
      {copied ? t("common.shared") : t("common.share")}
    </button>
  );
}
