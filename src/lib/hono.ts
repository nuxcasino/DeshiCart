import { hc } from "hono/client";
import type { CategoriesRoute } from "@/server/api/categories";
import type { HealthRoute } from "@/server/api/health";
import type { ProductsRoute } from "@/server/api/products";
import type { ReviewsRoute } from "@/server/api/reviews";

// Per-domain typed RPC clients (§7: split clients keep the type graph small).
// Server components should keep importing the service layer (src/lib/*)
// directly; these clients are for client components doing mutations/reads.
export const healthClient = hc<HealthRoute>("/api/health");
export const categoriesClient = hc<CategoriesRoute>("/api/categories");
export const productsClient = hc<ProductsRoute>("/api/products");
export const reviewsClient = hc<ReviewsRoute>("/api/reviews");
