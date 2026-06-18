import { dict, DEFAULT_LANG, type Lang } from "./dictionary";

export type { Lang };
export { LANGS, DEFAULT_LANG } from "./dictionary";

export const LANG_COOKIE = "lang";

export function normalizeLang(value: string | undefined | null): Lang {
  return value === "en" ? "en" : DEFAULT_LANG;
}

// Translates a key for the given language, falling back to the key itself.
export function translate(lang: Lang, key: string): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry[DEFAULT_LANG] ?? key;
}
