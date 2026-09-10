import type { MetadataRoute } from "next";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { LOCALES } from "@/lib/locale";

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

const STATIC_PATHS = [
  "/",
  "/shop",
  "/login",
  "/signup",
  "/wishlist",
  "/faq",
  "/shipping",
  "/returns",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [];
  for (const lang of LOCALES) {
    for (const path of STATIC_PATHS) {
      urls.push({
        url: `${base}/${lang}${path === "/" ? "" : path}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: path === "/" ? 1 : 0.7,
      });
    }
  }

  try {
    const [cats, prods] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
    ]);
    for (const lang of LOCALES) {
      for (const c of cats) {
        urls.push({
          url: `${base}/${lang}/shop?category=${c.slug}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.6,
        });
      }
      for (const p of prods) {
        urls.push({
          url: `${base}/${lang}/product/${p.slug}`,
          lastModified: p.createdAt,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Sitemap must never break the build when the DB is unreachable.
  }
  return urls;
}
