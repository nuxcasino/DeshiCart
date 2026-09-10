import type { MetadataRoute } from "next";

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout", "/account", "/order/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
