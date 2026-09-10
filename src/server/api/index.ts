import { Hono } from "hono";
import { AppError, errorBody } from "../errors";
import health from "./health";
import categories from "./categories";
import products from "./products";
import reviews from "./reviews";
import orders from "./orders";
import payments from "./payments";
import auth from "./auth";
import addresses from "./addresses";
import coupons from "./coupons";
import shipping from "./shipping";
import wishlist from "./wishlist";
import contact from "./contact";
import returns from "./returns";

// Hono API boundary (§7). Routers live per-domain with Zod-validated inputs;
// business logic stays in the service layer (src/lib/*), unchanged.
// New domains mount here; the catch-all src/app/api/[[...route]]/route.ts
// serves everything under /api that no legacy route file claims.
const app = new Hono()
  .basePath("/api")
  .route("/health", health)
  .route("/categories", categories)
  .route("/products", products)
  .route("/reviews", reviews)
  .route("/orders", orders)
  .route("/payments", payments)
  .route("/auth", auth)
  .route("/addresses", addresses)
  .route("/coupons", coupons)
  .route("/shipping", shipping)
  .route("/wishlist", wishlist)
  .route("/contact", contact)
  .route("/returns", returns);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(errorBody(err), err.status as 400);
  }
  console.error("[api:error]", err);
  return c.json({ error: "Something went wrong.", code: "INTERNAL_ERROR" }, 500);
});

export type AppType = typeof app;
export default app;
