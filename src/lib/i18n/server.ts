import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, translate, type Lang } from "./index";

// Reads the language from the cookie for use in Server Components.
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}

// Returns a translator bound to the request's language (Server Components).
export async function getT(): Promise<(key: string) => string> {
  const lang = await getLang();
  return (key: string) => translate(lang, key);
}
