// Shared locale constants (runtime-agnostic: safe for middleware AND app code).

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "deshicart:lang";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "bn" || value === "en";
}

/** Prefix a root-absolute path: lp("bn", "/shop") → "/bn/shop". */
export function lp(lang: Locale, path: string): string {
  return `/${lang}${path === "/" ? "" : path}`;
}

/** Swap the locale prefix of the current pathname. */
export function switchLocalePath(pathname: string, lang: Locale): string {
  const parts = pathname.split("/");
  if (parts[1] === "bn" || parts[1] === "en") {
    parts[1] = lang;
    return parts.join("/") || "/";
  }
  return lp(lang, pathname);
}
