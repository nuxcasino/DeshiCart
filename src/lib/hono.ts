import { hc } from "hono/client";
import type { AddressesRoute } from "@/server/api/addresses";
import type { AuthRoute } from "@/server/api/auth";
import type { CategoriesRoute } from "@/server/api/categories";
import type { ContactRoute } from "@/server/api/contact";
import type { CouponsRoute } from "@/server/api/coupons";
import type { HealthRoute } from "@/server/api/health";
import type { OrdersRoute } from "@/server/api/orders";
import type { PaymentsRoute } from "@/server/api/payments";
import type { ProductsRoute } from "@/server/api/products";
import type { ReturnsRoute } from "@/server/api/returns";
import type { ReviewsRoute } from "@/server/api/reviews";
import type { ShippingRoute } from "@/server/api/shipping";
import type { WishlistRoute } from "@/server/api/wishlist";

// Per-domain typed RPC clients (§7: split clients keep the type graph small).
// Server components should keep importing the service layer (src/lib/*)
// directly; these clients are for client components doing mutations/reads.
export const healthClient = hc<HealthRoute>("/api/health");
export const categoriesClient = hc<CategoriesRoute>("/api/categories");
export const productsClient = hc<ProductsRoute>("/api/products");
export const reviewsClient = hc<ReviewsRoute>("/api/reviews");
export const ordersClient = hc<OrdersRoute>("/api/orders");
export const paymentsClient = hc<PaymentsRoute>("/api/payments");
export const authClient = hc<AuthRoute>("/api/auth");
export const addressesClient = hc<AddressesRoute>("/api/addresses");
export const couponsClient = hc<CouponsRoute>("/api/coupons");
export const shippingClient = hc<ShippingRoute>("/api/shipping");
export const wishlistClient = hc<WishlistRoute>("/api/wishlist");
export const contactClient = hc<ContactRoute>("/api/contact");
export const returnsClient = hc<ReturnsRoute>("/api/returns");
