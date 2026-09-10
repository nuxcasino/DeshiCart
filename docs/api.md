# API Reference

Base URL is same-origin (the app calls these via relative `/api/*` paths).
Storefront endpoints are public; auth/account/address endpoints use the session
cookie. All request/response bodies are JSON.

Abuse-prone endpoints are rate-limited per IP (in-memory sliding window):
orders and payment-init 10/min, signup/login 10/min, reviews 5/min.
Exceeding the limit returns `429 { "error": "Too many requests…" }`.
Checkout inputs are length-capped and emails validated server-side.

---

## `GET /api/health`

Liveness probe — runs `SELECT 1` against the database.

- **Auth:** none
- **Response `200`:**
  ```json
  { "ok": true }
  ```
- **Response `500`** (DB unreachable):
  ```json
  { "ok": false }
  ```
- Source: `src/app/api/health/route.ts`

---

## `POST /api/orders`

Creates an order. Prices are recomputed server-side from the database; any
client-side totals are ignored. Quantities are clamped to 1–10 per line.

- **Auth:** none
- **Request body:**
  ```json
  {
    "customerName": "Ayesha Rahman",
    "email": "ayesha@email.com",
    "phone": "01XXXXXXXXX",
    "address": "House 12, Road 5, Dhanmondi",
    "city": "Dhaka",
    "notes": "Call before delivery",
    "paymentMethod": "cod",
    "items": [
      { "productId": 3, "size": "M", "quantity": 2 }
    ]
  }
  ```
  Required: `items` (non-empty, at least one valid `productId`),
  `customerName`, `email`, `phone`, `address`, `city`.
  Optional: `notes` (empty → `null`), `paymentMethod` (defaults to `"cod"` —
  free-form string: `"cod" | "bkash" | "card"` by convention), per-item `size`.
- **Response `201`:**
  ```json
  { "orderId": 42 }
  ```
  The client clears the cart and navigates to `/order/42`.
- **Errors:**
  - `400 { "error": "Missing required fields" }` — required field absent/blank
  - `400 { "error": "No valid items" }` — none of the `productId`s exist
  - `409 { "error": "Some items don't have enough stock", "items": [{ "productId", "name", "available" }] }` — requested quantity exceeds stock; nothing is reserved or created
  - `409 { "error": "Some items just sold out", "items": [...] }` — lost a checkout race; any partial reservation is restored
  - `500 { "error": "Could not place order. Please try again." }` — order insert failed after reservation; reserved stock is released
  - `400 { "error": "Invalid request" }` — malformed JSON / unexpected failure
- **Side effects:** conditionally decrements `products.stock` per line
  (`stock >= quantity`, so concurrent checkouts can't oversell), then inserts one
  `orders` row and one `order_items` row per line (snapshotting `name`, `image`,
  `price` at purchase time). Shipping is `৳80`, free when subtotal ≥ `৳3,000`.
- Source: `src/app/api/orders/route.ts`

---

## `POST /api/reviews`

Adds a review to a product and refreshes the product's denormalized `rating`
(1-decimal average) and `review_count`.

- **Auth:** none
- **Request body:**
  ```json
  {
    "productId": 3,
    "rating": 5,
    "author": "Rafiul H.",
    "title": "Great fit",
    "body": "Ordered Thursday night, wearing it at Friday's adda."
  }
  ```
  Required: `productId`, `author` (max 80 chars), `body` (max 2000 chars).
  Optional: `title` (max 140 chars). `rating` is clamped to 1–5 (defaults to 5).
  New reviews are created with `verified: false`.
- **Response `201`:**
  ```json
  {
    "review": {
      "id": 7,
      "productId": 3,
      "author": "Rafiul H.",
      "rating": 5,
      "title": "Great fit",
      "body": "Ordered Thursday night, wearing it at Friday's adda.",
      "verified": false,
      "createdAt": "2026-09-10T10:00:00.000Z"
    }
  }
  ```
- **Errors:**
  - `400 { "error": "productId, author and body are required" }`
  - `404 { "error": "Product not found" }`
  - `400 { "error": "Invalid request" }` — malformed JSON / unexpected failure
- Source: `src/app/api/reviews/route.ts`

---

## Online payments (SSLCommerz)

Checkout offers Cash on Delivery (direct `POST /api/orders`, confirmed immediately)
and **Online Payment** (`paymentMethod: "sslcommerz"`), which flows through:

```text
POST /api/payments/init  →  { orderId, gatewayUrl }  →  redirect customer
   →  gateway callbacks  →  success: /order/[id]  ·  fail/cancel: /checkout?error=…
```

The pending order is created with `status: "pending"`, `paymentStatus: "pending"`
and a generated `transactionId`; stock is reserved at init and released if payment
fails, is cancelled, or can't be verified. Only the server-side Order Validation
API (`val_id` check: status `VALID`/`VALIDATED`, matching `tran_id`, `BDT`
currency, exact amount) marks an order `paid` — callback parameters alone are
never trusted.

### `POST /api/payments/init`

Same body as `POST /api/orders` (items + contact/address; `paymentMethod` is
forced to `"sslcommerz"` server-side).

- **Response `200`:** `{ "orderId": 42, "gatewayUrl": "https://sandbox.sslcommerz.com/…" }`
- **Errors:** same `400`/`409` stock errors as `/api/orders`, plus
  `502 { "error": "…" }` when the gateway can't be reached (pending order is
  cancelled and stock released).

### `POST /api/payments/success` · `/fail` · `/cancel` · `/ipn`

Form-posted (`tran_id`, `val_id`, …) by SSLCommerz. `success` settles via
`settleOrderPayment()` and 303-redirects to `/order/[id]` (paid) or
`/checkout?error=payment-failed`; `fail`/`cancel` release stock and redirect to
`/checkout?error=payment-failed|cancelled`. `ipn` is the server-to-server
variant: same verification, JSON `{ "ok": true/false }`, idempotent.

- Sources: `src/app/api/payments/*/route.ts`, `src/lib/sslcommerz.ts`,
  `src/lib/payments.ts`, `src/lib/stock.ts`

### `POST /api/payments/reconcile`

Reconciles a `pending` order via the Transaction Query API (for payments that
succeeded at the bank but never returned to the site, e.g. abandoned tab).
Terminal (`failed`/`cancelled`) orders are never modified.

- **Request:** `{ "tranId": "DC-1725970000000" }`
- **Response `200`:** `{ "outcome": "paid" | "pending" | "failed" | "not-found", "orderId": 42 | null }`
- A `paid` result also persists gateway metadata on the order (`gateway_val_id`,
  `bank_tran_id`, `card_info`, `risk_level`, `store_amount`) — the same fields
  stored by the success/IPN path. `risk_level: 1` marks the payment for routine
  review (shown to the customer on the order page).

## Non-API server reads (for frontend developers)

These are not HTTP endpoints — pages query the DB directly via `src/lib/data.ts`:
`getCategories()`, `getFeaturedProducts()`, `getShopProducts({ category, sort,
minPrice, maxPrice, q })`, `getProductBySlug(slug)`, `getProductReviews(productId)`,
`getRelatedProducts(product)`, `getCategoryById(id)`. Shop page URL params:
`?category=<slug|all>`, `?sort=<featured|newest|price-asc|price-desc|rating>`,
`?q=<text>`, `?price=<min-max>` (e.g. `3000-`).

---

## Auth & account

Session cookie (`deshicart_session`) is HttpOnly; login/signup set it via
`Set-Cookie`. Passwords are scrypt-hashed, never returned.

- **`POST /api/auth/signup`** — `{ name, email, phone?, password (min 8) }` →
  `201 { user: { id, name, email, phone } }`. `409` if the email is taken.
- **`POST /api/auth/login`** — `{ email, password }` → `200 { user }`.
  `401` on bad credentials.
- **`POST /api/auth/logout`** — destroys the session, clears the cookie.
- **`GET /api/auth/me`** — `{ user, defaultAddress }` or `{ user: null }`.
  Used by the header and checkout prefill.
- **`GET /api/addresses`** — list own addresses (401 when logged out).
- **`POST /api/addresses`** — `{ label?, name, phone, address, city, postcode?, isDefault? }`.
  First address (or `isDefault: true`) becomes default. → `201 { address }`.
- **`PATCH /api/addresses/[id]`** — `{ isDefault: true }` to change default.
  `404` for another user's id.
- **`DELETE /api/addresses/[id]`** — removes it; promotes the oldest remaining
  address if it was the default.

Pages: `/login`, `/signup`, `/account` (order history + address book, redirects
to `/login` when anonymous).

---

## Coupons, shipping & wishlist

- **`POST /api/coupons/validate`** — `{ code, subtotal }` → `200 { code, discount }`
  (preview only, no usage consumed). `400` for unknown/inactive/expired/minimum-
  unmet/exhausted codes. Rate-limited 20/min per IP.
- **`GET /api/shipping?city=&subtotal=`** — `{ shipping }` district fee quote
  (zone row or flat-rule fallback).
- **`GET /api/wishlist`** — own saved products + ids (401 when logged out).
- **`POST /api/wishlist`** — `{ productId }` toggles save/unsave →
  `{ saved: boolean }` (401 redirects to login in the UI).
- Orders accept `couponCode`: validated + consumed atomically at placement
  (`409` when invalid/exhausted; usage released if the order later fails).
  Order rows carry `discount` + `coupon_code`, shown on receipts and order pages.
- **Admin:** `/admin/coupons` + `/api/admin/coupons` (GET/POST) and
  `/api/admin/coupons/[id]` (PATCH toggle/edit, DELETE);
  `/admin/zones` + `/api/admin/zones` (GET, POST upsert by city) and
  `/api/admin/zones/[id]` (DELETE). Pages: `/wishlist` (login required).

---

## Returns & refunds

Delivered-order owners file requests from `/account`; admins handle them at
`/admin/returns`. Online-paid orders refund via the gateway (needs the stored
`bank_tran_id`); COD refunds are marked for offline cash handling.

- **`GET /api/returns`** — own requests, newest first (401 when logged out).
- **`POST /api/returns`** — `{ orderId, reason }` → `201 { request }`.
  `404` for others' orders, `400` unless delivered, `409` when one is already open.
- **`POST /api/admin/returns/[id]`** — `{ action: "approve" | "reject" | "check" }`
  (403 without admin):
  - `approve` → gateway refund initiated (`processing`, request `approved`) or
    instant `refunded` for COD; customer notified in both cases.
  - `reject` → request `rejected` + customer notified.
  - `check` → polls refund status; `refunded` flips order to
    `paymentStatus: refunded` + request `refunded` + customer notified.
- Order rows track `refund_status` (`none|processing|refunded|cancelled`),
  `refund_ref_id`, `refund_amount`; requests track
  `requested|approved|rejected|refunded`.
- Sources: `src/lib/refunds.ts`, `src/app/api/returns/route.ts`,
  `src/app/api/admin/returns/[id]/route.ts`.

---

## Admin (`/admin`, all endpoints 403 without `is_admin`)

Bootstrap the first admin: sign up normally, then flip `is_admin` to `true` for
that row via `npm run db:studio` (or
`UPDATE users SET is_admin = true WHERE email = 'you@email.com'`). The admin
layout redirects non-admins to `/login`.

- **Pages:** `/admin` (revenue, counts, low stock, latest orders),
  `/admin/orders`, `/admin/orders/[id]` (customer, payment metadata incl.
  bank ref/channel/settled amount/risk, items, status form + gateway re-check),
  `/admin/products`, `/admin/products/new`, `/admin/products/[id]`,
  `/admin/categories`, `/admin/reviews`.
- **`PATCH /api/admin/orders/[id]`** — `{ status?, paymentStatus? }` (values
  validated against allow-lists).
- **`POST /api/admin/products`** — full product body (name, slug auto-normalized,
  description, price, categoryId, details/images one-per-line, sizes/colors
  comma-separated, badge, featured, stock). `409` on duplicate slug.
- **`PATCH /api/admin/products/[id]`** — partial update, same parsing.
- **`DELETE /api/admin/products/[id]`** — removes the product and its reviews
  (order history snapshots are unaffected).
- **`POST /api/admin/categories`** — `{ name, slug?, tagline?, image? }`.
- **`DELETE /api/admin/categories/[id]`** — `409` when products still use it.
- **`PATCH /api/admin/reviews/[id]`** — `{ verified: boolean }`.
- **`DELETE /api/admin/reviews/[id]`** — removes the review and recalculates the
  product's rating/review count.
