# Development Guide

## Project structure

- `src/app/` — App Router pages + API routes (see [architecture.md](architecture.md)).
  Pages are async server components (`force-dynamic`); only `/checkout` and
  interactive pieces (`CartDrawer`, `FiltersBar`, `PurchasePanel`, `ReviewForm`,
  `Header`, `Gallery`) are `"use client"`.
- `src/components/` — presentational + interactive UI. `ProductCard` and
  `QuickAddButton` bridge server-rendered lists to the client cart.
- `src/db/schema.ts` — the single source of truth for the data model.
- `src/lib/data.ts` — all server-side reads. `src/lib/seed.ts` + `seed-data.ts` —
  first-run demo content. `src/lib/cart-context.tsx` — client cart store.
  `src/lib/format.ts` — BDT formatting + shipping rules.

## Coding conventions

- TypeScript strict; path alias `@/*` → `./src/*`.
- Server components fetch directly via `src/lib/data.ts`; client components never
  import `@/db` or `@/lib/data` — they talk to `/api/*` with `fetch`.
- Prices are integers (BDT). Money math lives in `src/lib/format.ts`
  (`formatBDT`, `shippingFor`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FLAT`).
- Styling: Tailwind CSS v4 theme tokens in `src/app/globals.css`
  (`ink`, `cream`, `sand`, `clay`, `leaf`, `gold`; `font-display` = Fraunces).
  Prefer these tokens over hardcoded hex.
- Images: plain `<img>` tags (remote Pexels URLs), with the existing
  `eslint-disable-next-line @next/next/no-img-element` comment — do not migrate to
  `next/image` without also configuring `remotePatterns`.
- The three `eslint-disable-next-line react-hooks/set-state-in-effect` comments
  (cart hydration, mobile menu, search sync) are intentional external-system syncs —
  keep them, don't "refactor away".

## Development workflow

1. Create `.env` from `.env.example` (one time).
2. `npm install`, then `npm run dev`.
3. Edit → verify in browser → `npm run lint` + `npm run typecheck` → commit.
4. Keep `npm run build` green — Vercel runs it on every push.

## Adding new features

- **New page:** add `src/app/<route>/page.tsx` (server component by default; add
  `"use client"` only for interactivity). DB-backed pages need
  `export const dynamic = "force-dynamic"`.
- **New API endpoint:** add `src/app/api/<name>/route.ts` exporting `GET`/`POST`.
  Validate inputs explicitly (see `orders`/`reviews` routes), recompute money
  server-side, return `NextResponse.json` with correct status codes, and document
  it in [api.md](api.md).
- **Schema change:** edit `src/db/schema.ts` → `npm run db:generate` →
  `npm run db:push` (local) → commit `./drizzle` → apply to staging/prod DBs.
  If the demo catalog needs the new field, update `seed-data.ts` + `seed.ts`.
- **New product/category content:** edit `src/lib/seed-data.ts`. Note: seeding only
  runs on empty databases — existing DBs won't pick up new seed rows (insert
  directly or reset the tables).

## Running locally

```bash
npm run dev        # http://localhost:3000
npm run db:studio  # visual DB browser
```

Health check: http://localhost:3000/api/health → `{ "ok": true }`.

## Debugging

- DB issues: start with `/api/health`, then `db:studio`, then server console logs.
- Cart issues: inspect `localStorage` key `deshicart:cart:v1` in devtools.
- Checkout issues: watch the Network tab for `POST /api/orders` and read the
  returned `{ error }` body.
- Build issues: `npm run typecheck` reproduces build-time type errors; the Vercel
  deployment log shows the rest. More in [troubleshooting.md](troubleshooting.md).
