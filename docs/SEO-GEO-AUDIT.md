# SEO / GEO Audit

Audit date: 2026-09-10. Scope: technical discoverability for Google + AI
answer engines (ChatGPT, Gemini, Claude, Perplexity). No ranking promises —
only implemented facts.

## Crawlability — PASS

- `/sitemap.xml` lists every locale (`/bn`, `/en`), all categories, all
  products, and content pages; DB failures degrade to static-only, never 500.
- `/robots.txt` allows locale trees, disallows `/admin/`, `/api/`, checkout,
  account, wishlist, order, and auth pages.
- Middleware redirects unprefixed pages to `/bn`; no redirect chains (single
  307), `/api` and `/admin` bypass middleware.

## Canonical + hreflang — PASS

- Every public page emits `canonical` (BN URL) + `hreflang` `bn` / `en` /
  `x-default` via `localeAlternates()` (`src/lib/seo.ts`); `<html lang>`
  follows the URL locale.

## Structured data — PASS (genuine only)

- Layout: `ClothingStore` Organization + `WebSite` (EN+BN languages).
- Product pages: `Product` + `AggregateOffer` (BDT, variant price range,
  InStock/OutOfStock from live stock), `BreadcrumbList`, `AggregateRating`
  only when `reviewCount > 0`, `Review` only from real review rows (max 5).
- Home/shop: `ItemList`; FAQ page: `FAQPage` from the genuine FAQ content.
- No fake reviews, ratings, prices, or claims anywhere.

## Product HTML (§54) — PASS

- Title, description, price ("From ৳X" for variants), availability, images,
  variant options, category, and shipping/return info are server-rendered.
  Only cart/checkout interactivity is client-side.

## Content for AI systems (§41) — PASS (factual)

- `/faq` (8 real answers), `/shipping` (live fee table), `/returns` (7-day
  policy + flow), `/size-guide` (measured tables), `/contact`. No keyword
  stuffing, no cloaking, no AI-spam pages.

## Known gaps

- No review `dateModified`, no `VideoObject`, no merchant feed (Google
  Merchant Center) — future work, not blockers.
- OG images use product CDN URLs; no dedicated 1200×630 renders.
