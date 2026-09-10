# Integrations

## Neon PostgreSQL (database)

- Pooled connection string in `DATABASE_URL`. `*.neon.tech` hosts use the
  HTTPS driver (`@neondatabase/serverless` + resilient curl fallback in
  `src/db/neon-fetch.ts`); other hosts use a `node-postgres` pool.
- Schema syncs automatically on Vercel deploys (`vercel-build` →
  `drizzle-kit push`); migrations live in `./drizzle`.

## SSLCommerz (payments)

- Hosted checkout: `POST /api/payments/init` → gateway → callbacks
  (`success`/`fail`/`cancel`) + server-to-server `ipn` → Order Validation API
  (`VALID`/`VALIDATED`, tran/amount/currency checks) → settle.
- Sandbox: `sandbox.sslcommerz.com`; live: `securepay.sslcommerz.com`.
  Credentials resolve DB (encrypted) → `SSLCZ_*` env fallback.
- Refunds: `merchantTransIDvalidationAPI.php` (initiate + status). Live needs
  the server IP whitelisted.

## SSL Wireless (SMS)

- `send-sms` v3 API via `SSLW_API_TOKEN`/`SSLW_SID`; numbers normalized to
  `8801XXXXXXXXX`. Order/payment/status/return events.

## SMTP (email)

- Receipts, payment and status mails via `nodemailer` (`SMTP_*`); contact
  form delivers to `SHOP_EMAIL`. All sends are optional-and-logged.

## ImageKit (CDN)

- Server-side uploads (`POST /api/admin/images`) with
  `IMAGEKIT_*` env; metadata in `product_images`; legacy `products.images`
  re-synced for display. Provider abstraction in `src/lib/images/`.

## Bangladesh geo dataset

- `bangladesh-geo-data` (npm) seeds `divisions`/`districts`/`upazilas`
  idempotently at runtime; no third-party calls in request paths.

## Vercel Analytics

- `<Analytics />` in the root layout; traffic visible in the project dashboard.
