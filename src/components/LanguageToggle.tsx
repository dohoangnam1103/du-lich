"use client";

import { useI18n } from "@/components/I18nProvider";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "vi" ? "en" : "vi";
  return (
    <button
      type="button"
      className="glass-btn"
      onClick={() => setLang(next)}
      aria-label="Đổi ngôn ngữ / Change language"
      style={{ padding: "6px 12px", fontWeight: 700 }}
    >
      {lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
    </button>
  );
}
