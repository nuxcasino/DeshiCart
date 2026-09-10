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

/**
 * Localized content pick with English fallback (§18). BN fields are optional
 * editorial translations — empty BN falls back to EN, never to blank.
 */
export function pick<T extends { [k: string]: unknown }>(
  lang: Locale,
  row: T,
  field: keyof T & string
): string {
  if (lang === "bn") {
    const bnKey = `${field}Bn` as keyof T;
    const bn = row[bnKey];
    if (typeof bn === "string" && bn.trim() !== "") return bn;
  }
  return String(row[field] ?? "");
}

/** Localized string-array pick (e.g. product details) with EN fallback. */
export function pickList<T extends { [k: string]: unknown }>(
  lang: Locale,
  row: T,
  field: keyof T & string
): string[] {
  if (lang === "bn") {
    const bn = row[`${field}Bn` as keyof T];
    if (Array.isArray(bn) && bn.length > 0) return bn as string[];
  }
  const en = row[field];
  return Array.isArray(en) ? (en as string[]) : [];
}
