import type { MetadataRoute } from "next";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const staticRoutes = [
    "",
    "/shop",
    "/checkout",
    "/login",
    "/signup",
    "/wishlist",
    "/faq",
    "/shipping",
    "/returns",
    "/contact",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const [cats, prods] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
    ]);
    dynamic = [
      ...cats.map((c) => ({
        url: `${base}/shop?category=${c.slug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...prods.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // Sitemap must never break the build when the DB is unreachable.
  }
  return [...staticRoutes, ...dynamic];
}
