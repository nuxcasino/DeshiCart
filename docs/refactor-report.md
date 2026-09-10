# Refactor Report (master-program transformation)

What changed, why, and what was deliberately NOT done.

## Hono migration (§§7, 11) — DONE as specified

- `src/server/api/*` per-domain routers with Zod (`zValidator` + shared
  `validationHook` → uniform `{error, code}` 400s), `src/server/errors.ts`
  domain taxonomy mapped in `app.onError`, catch-all
  `src/app/api/[[...route]]/route.ts`, per-domain split RPC clients
  (`src/lib/hono.ts`).
- Migrated incrementally (reads → orders/payments → account/commerce → admin),
  each slice runtime-verified against a live server before push. Zero legacy
  route files remain.
- Deviations: no `hono/vercel` adapter needed (App Router handlers call
  `app.fetch` directly); services live in `src/lib/*` instead of
  `features/*`+repositories (existing structure already satisfied §55 without
  duplicate layers).

## Variants (§§9–14, 59) — DONE

- `product_variants` + variant-aware cart/checkout/snapshots/inventory;
  simple-product fallback preserved existing products with no migration of
  old rows. Known gap: gallery doesn't swap to the variant image (thumbnail
  in panel instead).

## Locations + shipping (§§15–17) — DONE

- Local master tables seeded from `bangladesh-geo-data`; override engine with
  legacy fallback. Saved addresses keep city-text only (ids resolve at
  checkout) — documented limitation.

## Payments (§§22–26, 56–57) — DONE (one adapter)

- Registry + AES-GCM credentials + admin config + transaction ledger + dynamic
  checkout + gateway fees. Only SSLCommerz + COD adapters exist; bKash/Nagad/
  Stripe rows are disabled stubs awaiting adapters.

## i18n (§§18–19) — DONE (bounded)

- `/bn` primary + `/en` routing, BN product/category content with fallback,
  bilingual search, hreflang/canonical/sitemap. English remains for API
  messages, cart snapshots, and the admin backoffice (documented).

## ImageKit (§§20–21) — DONE

- Abstraction + server uploads + admin manager + metadata table with legacy
  sync. No signed browser uploads (server-mediated instead — simpler and
  key-safe).

## Deliberately NOT done (per §62, no-overengineering)

- **Zustand / TanStack Query / shadcn / Radix / Motion / RHF / nuqs / date-fns /
  Sonner**: the existing context + RPC + Tailwind patterns cover current needs
  with less JS. Introduce only with a concrete, measured pain.
- **Redis, GraphQL, microservices**: rejected — single Next.js app + Neon is
  correct for this scale.
- **Upstash rate limiting**: in-memory per-instance limits documented as the
  first layer; upgrade on observed abuse, not before.
