# Architecture

DeshiCart is a fashion e-commerce storefront for Bangladesh (BDT pricing, COD / bKash
payment options). It is a single Next.js App Router application backed by a hosted
PostgreSQL database (Neon) via Drizzle ORM. There is no separate backend service and
no authentication system — checkout is guest-only and the cart lives in the browser.

## High-level diagram

```text
                    ┌──────────────────────────────┐
                    │            Browser            │
                    │  React Server Components      │
                    │  + Client Components          │
                    │  Cart state in localStorage   │
                    │  (src/lib/cart-context.tsx)   │
                    └───────┬──────────────┬───────┘
                            │ RSC render   │ fetch() POST
                            ▼              ▼
                    ┌──────────────────────────────┐
                    │   Next.js App Router (Node)   │
                    │                               │
                    │  Pages          API routes    │
                    │  /              POST /api/orders   │
                    │  /shop          POST /api/reviews  │
                    │  /product/[slug] GET /api/health   │
                    │  /checkout                    │
                    │  /order/[id]                  │
                    │                               │
                    │  Data layer (src/lib/data.ts) │
                    │  Auto-seed (src/lib/seed.ts)  │
                    └───────────────┬──────────────┘
                                    │  Drizzle ORM + @neondatabase/serverless
                                    │  (HTTPS, no direct TCP on serverless)
                                    ▼
                    ┌──────────────────────────────┐
                    │   Neon PostgreSQL (hosted)    │
                    │   categories, products,       │
                    │   reviews, orders, order_items│
                    └──────────────────────────────┘

External (no API keys needed): Pexels CDN images, Google Fonts (Fraunces + Manrope).
```

Deployment target: Vercel (Node.js serverless functions, `force-dynamic` rendering —
see [deployment.md](deployment.md)). No `vercel.json` is required; Vercel auto-detects
the Next.js app and `next build`.

## Application flow

1. **Browse.** `/` (home) and `/shop` are server components. They call
   `getCategories()` / `getFeaturedProducts()` / `getShopProducts()` in
   `src/lib/data.ts`, which first run `ensureSeeded()` (inserts demo catalog on a
   fresh database, idempotent via `onConflictDoNothing`) and then query Postgres.
2. **Product page.** `/product/[slug]` loads the product, its category, its reviews,
   and related products in parallel via `Promise.all`.
3. **Cart.** Purely client-side (`CartProvider` in `src/lib/cart-context.tsx`),
   persisted to `localStorage` key `deshicart:cart:v1`. The server never sees the cart
   until checkout.
4. **Checkout.** `/checkout` (client component) collects contact + address + payment
   choice and `POST`s to `/api/orders`. Prices are **re-computed server-side** from
   the database — client-submitted prices are ignored.
5. **Confirmation.** The API returns `{ orderId }`; the client clears the cart and
   navigates to `/order/[id]`, a server component that reads the order + items.
6. **Reviews.** `ReviewForm` `POST`s to `/api/reviews`, which inserts the review and
   refreshes the product's denormalized `rating` / `review_count`.

## Folder structure

```text
src/
  app/
    layout.tsx            Root layout: fonts, Header, Footer, CartDrawer, CartProvider
    page.tsx              Home (hero, collections, featured, editorial, testimonials)
    globals.css           Tailwind v4 theme tokens + keyframes + helpers
    shop/page.tsx         Catalog with ?category= ?sort= ?q= ?price= filters
    product/[slug]/page.tsx  Product detail + reviews + related items
    checkout/page.tsx     Checkout form (client component)
    order/[id]/page.tsx   Order confirmation (server component)
    api/
      health/route.ts     GET liveness probe (SELECT 1)
      orders/route.ts     POST create order + order items
      reviews/route.ts    POST create review + recompute product rating
  components/             Header, Footer, CartDrawer, ProductCard, Gallery,
                          PurchasePanel, QuickAddButton, FiltersBar, ReviewForm,
                          Stars
  db/
    schema.ts             Drizzle table definitions (single source of truth)
    index.ts              DB client: Neon HTTPS driver for *.neon.tech URLs,
                          node-postgres Pool for all other Postgres hosts
    neon-fetch.ts         Resilient fetch wrapper for the Neon SQL-over-HTTPS API
  lib/
    data.ts               Server-side queries (categories, products, reviews)
    seed.ts               Idempotent first-run seeder
    seed-data.ts          Demo catalog content (categories, products, reviews)
    cart-context.tsx      Client cart state + localStorage persistence
    format.ts             BDT formatting, shipping rules (৳80, free over ৳3,000)
drizzle/                  Generated SQL migration (drizzle-kit)
drizzle.config.ts         drizzle-kit config (reads DATABASE_URL)
```

## Authentication flow

Email + password accounts with scrypt hashing (`src/lib/auth.ts`, Node `crypto` —
no extra dependency). Sessions are random 256-bit tokens stored SHA-256-hashed
in the `sessions` table (30-day expiry), carried in an HttpOnly `SameSite=Lax`
cookie (`deshicart_session`, `Secure` in production). No JWT secret to manage.

```text
signup/login → scrypt verify → create session row → Set-Cookie
each request → hash cookie token → look up session + user (expiry-checked)
logout → delete session row + clear cookie
```

- Guest checkout still works: `orders.user_id` is nullable.
- Orders placed while logged in are linked and visible only to their owner
  (`/order/[id]` returns 404 otherwise); guest orders keep shareable links.
- `/account` (server component) redirects to `/login` when unauthenticated;
  checkout prefills contact/address from the account's default address.
- No email verification, password reset, or OAuth yet — see roadmap.

## API flow

```text
POST /api/orders   body: { customerName, email, phone, address, city,
                           notes?, paymentMethod, items: [{ productId, size?, quantity }] }
                   → validates required fields → loads products by id →
                     clamps qty 1–10 → server-computes subtotal + shipping →
                     inserts orders + order_items → 201 { orderId }

POST /api/reviews  body: { productId, rating, author, title?, body }
                   → validates → 404 if product missing → inserts review →
                     UPDATE products SET rating/review_count from aggregate →
                     201 { review }

GET  /api/health   → SELECT 1 → 200 { ok: true } / 500 { ok: false }
```

## Database relationships

```text
categories 1───* products 1───* reviews
                     │
orders 1───* order_items    (order_items.productId is a snapshot copy —
                             deliberately NOT a foreign key, so order history
                             survives product edits/deletes)
```

Tables: `categories`, `products` (denormalized `rating`, `review_count`),
`reviews`, `orders`, `order_items` (snapshot of `name`, `image`, `price` at purchase
time). Full column definitions live in `src/db/schema.ts`.

## External integrations

| Integration | Purpose | Credentials needed |
|---|---|---|
| Neon PostgreSQL | Primary database (`DATABASE_URL`) | Yes — pooled connection string |
| Pexels CDN (`images.pexels.com`) | Product / editorial images via plain `<img>` | No |
| Google Fonts | Fraunces + Manrope via `next/font/google` | No |
| Payments (bKash / card / COD) | Checkout labels only — **no gateway is integrated**; nothing is charged | No |
