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
import type { AdminCategoriesRoute } from "@/server/api/admin/categories";
import type { AdminCouponsRoute } from "@/server/api/admin/coupons";
import type { AdminOrdersRoute } from "@/server/api/admin/orders";
import type { AdminProductsRoute } from "@/server/api/admin/products";
import type { AdminReturnsRoute } from "@/server/api/admin/returns";
import type { AdminVariantsRoute } from "@/server/api/admin/variants";
import type { AdminReviewsRoute } from "@/server/api/admin/reviews";
import type { AdminZonesRoute } from "@/server/api/admin/zones";

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
export const adminProductsClient = hc<AdminProductsRoute>("/api/admin/products");
export const adminCategoriesClient = hc<AdminCategoriesRoute>("/api/admin/categories");
export const adminOrdersClient = hc<AdminOrdersRoute>("/api/admin/orders");
export const adminReviewsClient = hc<AdminReviewsRoute>("/api/admin/reviews");
export const adminCouponsClient = hc<AdminCouponsRoute>("/api/admin/coupons");
export const adminZonesClient = hc<AdminZonesRoute>("/api/admin/zones");
export const adminReturnsClient = hc<AdminReturnsRoute>("/api/admin/returns");
export const adminVariantsClient = hc<AdminVariantsRoute>("/api/admin/variants");
