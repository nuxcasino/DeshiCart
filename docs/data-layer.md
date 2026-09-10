# Data Layer

```
Pages / Hono routers
  ↓ (server components import lib directly; client via typed RPC)
Service libs (src/lib/*): auth, stock, variants, checkout-lines, coupons,
  shipping, locations, payments, refunds, gateways, notify, wishlist, images
  ↓
Drizzle ORM (src/db/*: schema.ts, index.ts, neon-fetch.ts)
  ↓
PostgreSQL / Neon
```

- **No separate repository classes** (§62): the `src/lib/*` service modules
  ARE the domain layer — one module per bounded context, no trivial
  pass-throughs.
- **Rules:** no client prices/discounts/shipping/stock/permissions/status are
  ever trusted; money math lives in services; Neon HTTP has no interactive
  transactions, so multi-step writes use validate → conditional-reserve →
  insert with compensation (`checkout-lines`, `stock`, `variants`).
- **Indexes (§47):** variant SKU unique + (product,color,size) unique +
  product FK; orders user/status; payment_transactions order/tran refs;
  districts/upazilas parents; product_images product. Added from actual query
  patterns only.
- **Caching (§48):** DB-backed pages are `force-dynamic`; admin/account/order
  data is never shared through public caches. Mutations revalidate via
  `router.refresh()`. No Redis (unneeded at this scale).
- **Migrations:** `npm run db:generate` → commit `./drizzle` → Vercel
  auto-syncs on deploy; `db:push` locally. All migrations additive so far.
- **Seeds:** demo catalog + shipping zones + BD locations + gateway registry
  self-seed idempotently on first request (`src/lib/seed.ts`).
