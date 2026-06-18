"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { LANG_COOKIE, normalizeLang, translate, type Lang } from "@/lib/i18n";

interface I18nContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nContext | null>(null);

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // Persist for both server (cookie) and quick client reads (localStorage).
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    try {
      window.localStorage.setItem(LANG_COOKIE, l);
    } catch {
      /* ignore */
    }
    // Reload so Server Components re-render in the new language.
    window.location.reload();
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback when used outside a provider (e.g. tests): default language.
    return {
      lang: normalizeLang(undefined),
      setLang: () => {},
      t: (key: string) => translate(normalizeLang(undefined), key),
    };
  }
  return ctx;
}

export function useT(): (key: string) => string {
  return useI18n().t;
}
