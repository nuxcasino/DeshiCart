import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getFeaturedProducts,
  getProductBySlug,
  getShopProducts,
  type SortKey,
} from "@/lib/data";
import { getProductVariants } from "@/lib/variants";
import { NotFoundError } from "../errors";
import { validationHook } from "../validate";

const listQuery = z.object({
  category: z.string().max(80).optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "rating"]).optional(),
  q: z.string().max(100).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  featured: z.enum(["true", "false"]).optional(),
});

const app = new Hono()
  .get("/", zValidator("query", listQuery, validationHook), async (c) => {
    const q = c.req.valid("query");
    if (q.featured === "true") {
      return c.json({ products: await getFeaturedProducts() });
    }
    const products = await getShopProducts({
      category: q.category,
      sort: q.sort as SortKey | undefined,
      q: q.q,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
    });
    return c.json({ products });
  })
  .get("/:slug", async (c) => {
    const product = await getProductBySlug(c.req.param("slug"));
    if (!product) throw new NotFoundError("Product not found.");
    return c.json({ product, variants: await getProductVariants(product.id) });
  });

export type ProductsRoute = typeof app;
export default app;
