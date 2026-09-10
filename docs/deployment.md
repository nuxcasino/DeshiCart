# Deployment (Vercel)

## 1. Vercel setup

1. Push the repository to GitHub / GitLab / Bitbucket (make sure `.env` is
   **not** committed — it is covered by `.gitignore`).
2. In Vercel: **Add New → Project → Import** the repository.
3. Vercel auto-detects Next.js. Keep the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (preset default; `npm run build` equivalent)
   - Output Directory: (preset default, leave empty)
   - Install Command: `npm install`
   - Node.js version: 20+ (default is fine)
4. Add environment variables (see section 2), then **Deploy**.

No `vercel.json` is required: there are no custom rewrites/headers, no
`edge` runtimes, and images use plain `<img>` tags (no `next/image`
`remotePatterns` needed). One was deliberately not added — defaults are correct.

## 2. Environment variables

Set these in Vercel: **Project → Settings → Environment Variables**.
Apply to **Production** and **Preview** (and Development if you use `vercel dev`).

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string, e.g. Neon's `-pooler` URL with `?sslmode=require` |
| `SSLCZ_STORE_ID` / `SSLCZ_STORE_PASSWORD` | For online payments | SSLCommerz credentials (sandbox demo values work for testing; live creds for real money) |
| `SSLCZ_SANDBOX` | Recommended | `"true"` for testing, `"false"` for live payments (defaults to `"true"`) |
| `SITE_URL` | Optional | Absolute site URL for gateway callbacks (falls back to request host) |

Details and rotation guidance: [environment.md](environment.md).

### Preview environments (recommended)

Never point Vercel Preview at the production database — test orders, accounts,
and schema syncs would pollute live data. Instead:

1. Neon dashboard → **Branches** → create a `preview` branch (copy-on-write,
   instant, near-zero cost).
2. Copy the preview branch's pooled connection string.
3. Vercel → Project → Settings → Environment Variables → set `DATABASE_URL` to
   the preview string for the **Preview** environment only (Production keeps the
   main branch string).
4. Every preview deployment auto-syncs the schema (`vercel-build` →
   `drizzle-kit push`) and self-seeds the demo catalog on first load — reviewers
   get a fresh working store with zero manual steps.
5. Keep `SSLCZ_SANDBOX="true"` on Preview always; only Production ever gets live
   gateway credentials.

> The `main` branch is protected by the CI workflow
> (`.github/workflows/ci.yml`: lint + typecheck + build on every push/PR).
> The build job uses a dummy `DATABASE_URL` — pages are `force-dynamic` and the
> sitemap degrades gracefully, so CI needs no live database.

> The build (`next build`) imports `src/db/index.ts`, which throws at module load
> if `DATABASE_URL` is missing. **The production build will fail without it set.**

## 3. Database configuration

- **Provider:** Neon PostgreSQL (any Postgres works; `*.neon.tech` URLs use the
  HTTPS driver, others use a `node-postgres` pool — see `src/db/index.ts`).
- **Auto-migration on deploy:** the `vercel-build` script in `package.json`
  (`drizzle-kit push && next build`) syncs `src/db/schema.ts` to the database on
  every Vercel deployment — no manual step, no `vercel.json` needed (Vercel
  auto-detects the `vercel-build` script). Local `npm run build` is unaffected.
  - `push` is idempotent: if the schema is already in sync it is a no-op.
  - If a schema change is **destructive** (drop column/table, type change with data
    loss), `push` refuses to run non-interactively and the build fails safely —
    apply that change manually with `npm run db:push` from your machine, then
    redeploy.
- **Seeding:** the app self-seeds on first request (`ensureSeeded()` in
  `src/lib/seed.ts`, idempotent via `onConflictDoNothing`). Safe under concurrent
  cold starts, but adds latency to the first request after a deploy.
- **Schema-change workflow:** edit `src/db/schema.ts` → `npm run db:generate`
  (updates `./drizzle`) → commit → push to `main` → Vercel auto-syncs on deploy.
  Verify with `GET /api/health` afterwards.

## 4. Build settings

- `npm run build` → `next build` (Turbopack). TypeScript is checked during build.
- On Vercel, `npm run vercel-build` runs instead: `drizzle-kit push` (schema sync)
  followed by `next build`. Both steps need `DATABASE_URL`.
- `npm run lint` is **not** run by `next build` (Next 16); run it in CI if you
  want lint gates.
- All DB-backed pages are `export const dynamic = "force-dynamic"`, so the build
  does not need database access to prerender — but `DATABASE_URL` must still be
  *set* (module-load guard), even if never queried at build time.

## 5. Domain configuration

1. Vercel: **Project → Settings → Domains → Add** your domain.
2. At your DNS provider, add the records Vercel shows (A `76.76.21.21` for apex
   or CNAME `cname.vercel-dns.com` for subdomains).
3. Vercel provisions TLS automatically. No app code changes needed (no hardcoded
   hosts; API calls use relative `/api/*` paths).

## 6. Production checklist

- [ ] `DATABASE_URL` set for Production (+ Preview) — pooled Neon URL, SSL on
- [ ] Schema applied to the production database (`db:push` / `db:migrate`)
- [ ] `npm run build` passes locally against a Preview-like env
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] Home, shop filters, product page, checkout → order confirmation tested
- [ ] `GET /api/health` returns `{ "ok": true }` on the deployment
- [ ] `.env` with real credentials never committed; exposed credential rotated
      (see [environment.md](environment.md) — a live key was previously in `.env`)
- [ ] Understood limitations: guest-only checkout, no real payment processing,
      order pages guessable by id, reviews unmoderated (see risks below)

## 7. Rollback procedure

- **Instant rollback:** Vercel → **Deployments** → select the last known-good
  deployment → **Promote to Production**.
- **Database rollback:** schema changes are not auto-applied, so rolling back code
  does not roll back the DB. For breaking schema changes, restore the Neon
  database from a backup / point-in-time recovery **before** promoting the old
  deployment, and verify `/api/health` plus checkout afterwards.
- Order/review rows created while the bad deployment was live are preserved
  (rollback only changes code, not data).
