# Environment Variables

The application uses exactly **one** environment variable. It is referenced in
`src/db/index.ts` (app runtime) and `drizzle.config.ts` (drizzle-kit CLI).

## `DATABASE_URL` — required

- **Purpose:** PostgreSQL connection string for the app and for drizzle-kit
  (`db:push`, `db:migrate`, `db:studio`).
- **Where to set:**
  - Local: `.env` (copy from `.env.example`; git-ignored).
  - Vercel: Project → Settings → Environment Variables (Production + Preview).
- **Example value (placeholder — not a real credential):**
  ```text
  DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-xxxx-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  ```
- **Notes:**
  - For Neon, use the **pooled** (`-pooler`) URL with `sslmode=require`. The app
    detects `*.neon.tech` hosts and uses the HTTPS driver
    (`@neondatabase/serverless`), which avoids direct TCP on port 5432 — important
    on serverless runtimes.
  - Non-Neon Postgres hosts use a `node-postgres` pool instead (same code path,
    no config change needed).
  - The app throws `DATABASE_URL is required` at startup/build if it is missing.

## `NODE_ENV` — optional (standard)

- Set automatically by Vercel and by `next dev` / `next build` / `next start`.
- Only referenced to skip dev-only connection-pool caching. You do not need to set
  it manually.

## `SSLCZ_STORE_ID` / `SSLCZ_STORE_PASSWORD` — required for online payments

- **Purpose:** SSLCommerz merchant credentials for the "Online Payment" checkout
  method (init + server-side transaction validation).
- **Sandbox:** `.env.example` ships SSLCommerz's public demo credentials
  (`testbox` / `qwerty`) — safe to use for testing, never for real money.
- **Production:** replace with your store credentials and set `SSLCZ_SANDBOX="false"`.

## `SSLCZ_SANDBOX` — optional (defaults to `"true"`)

- `"true"` → `https://sandbox.sslcommerz.com`; `"false"` → live
  `https://securepay.sslcommerz.com`. Any value other than `"false"` (case-insensitive)
  means sandbox — so production must set it explicitly to `"false"`.

## `SITE_URL` — optional

- Absolute site URL used to build SSLCommerz `success/fail/cancel/ipn` callback
  URLs. If unset, the app falls back to the incoming request's host (correct on
  Vercel by default). Set it explicitly when using a custom domain.
- Example: `SITE_URL="https://deshi-cart.vercel.app"`

## Notifications — all optional

Order SMS + email (`src/lib/notify.ts`) send on placement (COD), payment success,
and admin status changes. **Every variable below is optional:** when SMS or SMTP
credentials are absent, that channel is skipped with a console log and ordering
works normally.

- **SMS via SSL Wireless:** `SSLW_API_TOKEN`, `SSLW_SID` — POSTs to the v3
  `send-sms` API; customer numbers are normalized to `8801XXXXXXXXX`.
- **Email via SMTP:** `SMTP_HOST`, `SMTP_PORT` (default 587, 465 = implicit TLS),
  `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (falls back to `SMTP_USER`).
- Notification failures are caught and logged — they never fail an order, payment
  callback, or admin update.

## Secret hygiene

- Never commit `.env`. Never paste credentials into docs, issues, or chat.
- ⚠️ **Incident note:** a live Neon `DATABASE_URL` (user `neondb_owner`) was found
  committed in the local `.env` file during this production-readiness pass. Before
  going live: **rotate that credential in the Neon dashboard** (reset the password
  / create a dedicated role), update `.env` locally and `DATABASE_URL` in Vercel,
  and confirm `.env` has never been pushed to any remote
  (`git log --all -- .env`). Treat the old password as compromised.
