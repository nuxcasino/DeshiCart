import { Suspense } from "react";
import Link from "next/link";
import { getCategories, getShopProducts, type SortKey } from "@/lib/data";
import { getWishlistIds } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import FiltersBar from "@/components/FiltersBar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All — DeshiCart",
  description: "Browse trendy t-shirts, shirts, women's fashion and accessories.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const category = first(params.category);
  const sort = first(params.sort) as SortKey | undefined;
  const q = first(params.q);
  const price = first(params.price);

  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (price) {
    const [lo, hi] = price.split("-");
    if (lo) minPrice = parseInt(lo, 10) || undefined;
    if (hi) maxPrice = parseInt(hi, 10) || undefined;
  }

  const [categories, products, wishlistIds] = await Promise.all([
    getCategories(),
    getShopProducts({ category, sort, q, minPrice, maxPrice }),
    getWishlistIds(),
  ]);

  const activeCat = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
          {activeCat ? activeCat.tagline : "The full collection"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {activeCat ? activeCat.name : "Shop All"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {products.length} {products.length === 1 ? "style" : "styles"}
          {q ? ` matching “${q}”` : ""}
        </p>
      </div>

      <Suspense fallback={<div className="h-24" />}>
        <FiltersBar categories={categories} />
      </Suspense>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-3xl">
            🔍
          </div>
          <p className="font-display text-xl">Nothing matched that</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Try a different search, or clear the filters to see the full
            collection.
          </p>
          <Link
            href="/shop"
            className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} wishlisted={wishlistIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
