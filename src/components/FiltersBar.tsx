"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/db/schema";
import { pick, type Locale } from "@/lib/locale";

const priceRanges = [
  { label: "Any price", value: "" },
  { label: "Under ৳1,000", value: "0-1000" },
  { label: "৳1,000 – ৳2,000", value: "1000-2000" },
  { label: "৳2,000 – ৳3,000", value: "2000-3000" },
  { label: "Over ৳3,000", value: "3000-" },
];

const sortOptions = [
  { label: "Featured", value: "featured" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
  { label: "Top Rated", value: "rating" },
];

export default function FiltersBar({
  categories,
  lang,
}: {
  categories: Category[];
  lang: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "all";
  const activeSort = searchParams.get("sort") ?? "featured";
  const activePrice = searchParams.get("price") ?? "";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    // Intentional external-system sync: keep the search input in sync with the URL (?q=).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "featured") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[{ id: 0, name: "All", nameBn: "সব", slug: "all" }, ...categories].map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setParam("category", cat.slug)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeCategory === cat.slug
                ? "bg-ink text-cream shadow-md"
                : "border border-sand bg-white text-ink-soft hover:border-clay hover:text-clay"
            }`}
          >
            {pick(lang, cat, "name")}
          </button>
        ))}
      </div>

      {/* Search / price / sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", query.trim());
          }}
          className="relative w-full sm:max-w-xs"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full border border-sand bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-clay"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </form>

        <div className="flex gap-2">
          <select
            value={activePrice}
            onChange={(e) => setParam("price", e.target.value)}
            className="rounded-full border border-sand bg-white px-4 py-2.5 text-xs font-semibold text-ink-soft outline-none transition-colors focus:border-clay"
          >
            {priceRanges.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={activeSort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="rounded-full border border-sand bg-white px-4 py-2.5 text-xs font-semibold text-ink-soft outline-none transition-colors focus:border-clay"
          >
            {sortOptions.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
