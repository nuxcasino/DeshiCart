# Troubleshooting

## Build failures

- **`DATABASE_URL is required` / `DATABASE_URL is missing` during `next build`**
  `src/db/index.ts` (and `drizzle.config.ts`) throw at module load when the variable
  is absent. Fix: create `.env` from `.env.example` locally; on Vercel set
  `DATABASE_URL` under Project → Settings → Environment Variables and redeploy.
- **`next build` succeeds locally but fails on Vercel:** compare Node versions and
  confirm Vercel has `DATABASE_URL` for the failing environment (Production vs
  Preview are separate). Check the failing log's "Environments" line.
- **TypeScript errors in build:** run `npm run typecheck` locally and fix the
  reported file/line — the build runs the same check.

## Missing env variables

- Only `DATABASE_URL` exists (see [environment.md](environment.md)). If pages crash
  with "DATABASE_URL is required", the env file is missing, misnamed (must be
  exactly `.env` in the project root for local dev), or not applied to the current
  Vercel environment.

## Database connection issues

- **`/api/health` returns `{ "ok": false }`:** the app cannot reach Postgres.
  Verify the connection string (password, host, `sslmode=require`), confirm the
  Neon project is not suspended/deleted, and check Neon dashboard logs.
- **Timeouts from serverless (Vercel) but works locally:** use the Neon **pooled**
  (`-pooler`) hostname — the app uses the HTTPS driver for `*.neon.tech`, which
  avoids blocked direct-TCP port 5432. A non-pooler / direct host on Vercel is the
  usual cause.
- **`relation "products" does not exist`:** schema was never applied to this
  database. Run `npm run db:push` (or `db:migrate`) with `DATABASE_URL` pointed at
  it, then reload.
- **Empty shop on a fresh database:** expected until the first request finishes
  `ensureSeeded()`; just reload once. If it persists, check DB permissions
  (the role needs INSERT on all tables).
- **Drizzle Studio won't connect:** it uses `DATABASE_URL` from `.env` — same
  checks as above.

## Authentication problems

There is no authentication in this project — no login pages, sessions, or tokens.
"Logged out" states, 401s, or OAuth errors cannot originate here; look at the
hosting layer (e.g. Vercel Password Protection / SSO) instead.

## Vercel deployment failures

- **Build → "Environment variable not found":** add `DATABASE_URL` and redeploy
  (changing env vars requires a redeploy to take effect).
- **Function timeouts on first request:** cold start + `ensureSeeded()` on an empty
  DB. Usually self-resolves; pre-seed the DB (`npm run db:push`, load the site once)
  before announcing the launch.
- **404s on `/api/*`:** confirm the deployment is a Next.js project (not static
  export) — API routes only run on the server.

## Common runtime errors

- **"useCart must be used within CartProvider":** the component is rendered outside
  `<CartProvider>` in `src/app/layout.tsx`. Keep all cart consumers under it.
- **Hydration mismatch warnings in cart badge:** by design the server renders an
  empty cart and the client hydrates from `localStorage` — harmless, do not "fix"
  by reading storage during render.
- **Order confirmation 404 (`/order/[id]`):** non-integer or non-existent id.
  Orders are sequential integers; there is no lookup by anything else.
- **Review submit fails:** `productId` must exist, `author`/`body` non-empty;
  check the API error body (`Missing required fields` / `Product not found`).
- **Images not loading:** product images are remote Pexels CDN URLs rendered with
  plain `<img>` — check network access to `images.pexels.com`, not `next/image`
  config (it is intentionally unused).
