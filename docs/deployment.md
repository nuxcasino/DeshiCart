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

Details and rotation guidance: [environment.md](environment.md).

> The build (`next build`) imports `src/db/index.ts`, which throws at module load
> if `DATABASE_URL` is missing. **The production build will fail without it set.**

## 3. Database configuration

- **Provider:** Neon PostgreSQL (any Postgres works; `*.neon.tech` URLs use the
  HTTPS driver, others use a `node-postgres` pool — see `src/db/index.ts`).
- **Schema:** apply once per database with `npm run db:push` (or `db:migrate`)
  from your machine pointed at the same `DATABASE_URL`.
- **Seeding:** the app self-seeds on first request (`ensureSeeded()` in
  `src/lib/seed.ts`, idempotent via `onConflictDoNothing`). Safe under concurrent
  cold starts, but adds latency to the first request after a deploy.
- **Migrations on deploy:** there is no CI migration hook. For schema changes,
  run `npm run db:generate` locally, commit `./drizzle`, apply to the database,
  then deploy.

## 4. Build settings

- `npm run build` → `next build` (Turbopack). TypeScript is checked during build.
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
