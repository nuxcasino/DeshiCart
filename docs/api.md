# API Reference

Base URL is same-origin (the app calls these via relative `/api/*` paths).
No authentication on any endpoint. All request/response bodies are JSON.

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

## Non-API server reads (for frontend developers)

These are not HTTP endpoints — pages query the DB directly via `src/lib/data.ts`:
`getCategories()`, `getFeaturedProducts()`, `getShopProducts({ category, sort,
minPrice, maxPrice, q })`, `getProductBySlug(slug)`, `getProductReviews(productId)`,
`getRelatedProducts(product)`, `getCategoryById(id)`. Shop page URL params:
`?category=<slug|all>`, `?sort=<featured|newest|price-asc|price-desc|rating>`,
`?q=<text>`, `?price=<min-max>` (e.g. `3000-`).
