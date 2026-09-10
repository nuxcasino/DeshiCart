import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NotFoundError } from "../errors";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";
import { validationHook } from "../validate";

const createReview = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5).default(5),
  author: z.string().trim().min(1).max(80),
  title: z.string().trim().max(140).default(""),
  body: z.string().trim().min(1).max(2000),
});

const app = new Hono().post("/", zValidator("json", createReview, validationHook), async (c) => {
  if (isRateLimited(`reviews:${clientIp(c.req.raw)}`, 5, 60_000)) {
    return rateLimitedResponse();
  }
  const input = c.req.valid("json");

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, input.productId));
  if (!product) throw new NotFoundError("Product not found.");

  const [review] = await db
    .insert(reviews)
    .values({
      productId: input.productId,
      rating: input.rating,
      author: input.author,
      title: input.title,
      body: input.body,
    })
    .returning();

  await db.execute(sql`
    UPDATE products p SET
      rating = agg.avg_rating,
      review_count = agg.cnt
    FROM (
      SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS cnt
      FROM reviews WHERE product_id = ${input.productId}
    ) agg
    WHERE p.id = ${input.productId}
  `);

  return c.json({ review }, 201);
});

export type ReviewsRoute = typeof app;
export default app;
