import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

async function recalcProductRating(productId: number) {
  await db.execute(sql`
    UPDATE products p SET
      rating = COALESCE(agg.avg_rating, 0),
      review_count = COALESCE(agg.cnt, 0)
    FROM (
      SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS cnt
      FROM reviews WHERE product_id = ${productId}
    ) agg
    WHERE p.id = ${productId}
  `);
}

const verifyBody = z.object({
  verified: z.boolean(),
});

const app = new Hono()
  .patch("/:id", zValidator("json", verifyBody, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const reviewId = Number(c.req.param("id"));
    if (!Number.isInteger(reviewId)) {
      return c.json({ error: "Invalid review id." }, 400);
    }
    const [updated] = await db
      .update(reviews)
      .set({ verified: c.req.valid("json").verified })
      .where(eq(reviews.id, reviewId))
      .returning();
    if (!updated) throw new NotFoundError("Review not found.");
    return c.json({ review: updated });
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const reviewId = Number(c.req.param("id"));
    if (!Number.isInteger(reviewId)) {
      return c.json({ error: "Invalid review id." }, 400);
    }
    const [row] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!row) throw new NotFoundError("Review not found.");
    await db.delete(reviews).where(eq(reviews.id, reviewId));
    await recalcProductRating(row.productId);
    return c.json({ ok: true });
  });

export type AdminReviewsRoute = typeof app;
export default app;
