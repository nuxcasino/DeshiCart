# Admin Guide

Backoffice at `/admin` (unprefixed by design; English-only). Access requires
`users.is_admin` — enforced in `src/app/admin/layout.tsx` (`requireAdmin()`)
and in every `/api/admin/*` router (`requireAdminRequest()` → 403).
Bootstrap the first admin via `npm run db:studio` (flip `is_admin`).

## Sections

- **Dashboard** (`/admin`): revenue (excl. cancelled), order counts, pending
  payments, risky-paid flag, low stock, latest orders.
- **Orders** (`/admin/orders`, `/[id]`): customer, payment metadata (bank ref,
  channel, settled amount, risk), items with SKUs, status/payment editors,
  gateway re-check (reconcile API).
- **Returns** (`/admin/returns`): approve (gateway refund or COD-manual),
  reject, refund-status polling; customer notified at each step.
- **Products** (`/admin/products`, `/new`, `/[id]`): full form incl. Bangla
  fields + **Variants** manager (SKU auto-suggest, combo-uniqueness, price/
  stock inline edit, activate/deactivate, delete blocked with 409 when order
  history exists) + **Images** manager (CDN upload, reorder, primary, alt).
- **Inventory** (`/admin/inventory`): all variants with filter + inline stock
  adjust. Simple products keep product-level stock on their edit page.
- **Categories** (`/admin/categories`): create (+Bangla fields), delete guarded
  while products use the category.
- **Coupons** (`/admin/coupons`): flat/percent, min subtotal, max uses,
  expiry, enable/disable. Usage consumes atomically at checkout.
- **Shipping** (`/admin/zones`): location rules (division → district →
  upazila overrides) + legacy city zones. Most-specific active rule wins.
- **Gateways** (`/admin/payment-gateways`): enable/sandbox/maintenance,
  display name, currency, min/max, extra fee, priority, AES-256-GCM credential
  forms (masked), test connection. Needs `PAYMENT_CREDENTIALS_KEY` for saves.
- **Reviews** (`/admin/reviews`): verify/unverify, delete (rating recalculated).

## Conventions

- All mutations go through typed Hono RPC clients (`src/lib/hono.ts`
  `admin*` clients) with server-side Zod validation; destructive actions use
  `confirm()` plus server guards (409s) — never UI-only protection.
- After mutations, call `router.refresh()` to revalidate server data.
- Admin pages are `force-dynamic` and never cached across users.
