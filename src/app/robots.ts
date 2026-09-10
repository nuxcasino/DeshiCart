import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/locale";

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // Private areas in every locale; APIs and admin are never indexed.
  const privatePaths = LOCALES.flatMap((lang) => [
    `/${lang}/checkout`,
    `/${lang}/account`,
    `/${lang}/wishlist`,
    `/${lang}/order/`,
    `/${lang}/login`,
    `/${lang}/signup`,
  ]);
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/bn/", "/en/"],
        disallow: ["/admin/", "/api/", ...privatePaths],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
