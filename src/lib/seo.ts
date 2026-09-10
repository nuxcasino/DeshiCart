import type { Metadata } from "next";
import type { Locale } from "./locale";

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

export function localizedUrl(lang: Locale, path: string): string {
  return `${siteUrl()}/${lang}${path === "/" ? "" : path}`;
}

/**
 * Canonical + hreflang alternates for a public path (§19). BN is primary
 * (x-default points at the Bangla URL).
 */
export function localeAlternates(path: string): Pick<Metadata, "alternates"> {
  return {
    alternates: {
      canonical: localizedUrl("bn", path),
      languages: {
        bn: localizedUrl("bn", path),
        en: localizedUrl("en", path),
        "x-default": localizedUrl("bn", path),
      },
    },
  };
}
