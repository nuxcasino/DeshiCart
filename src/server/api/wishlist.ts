import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";
import { AuthenticationError, NotFoundError } from "../errors";
import { validationHook } from "../validate";

const toggleBody = z.object({
  productId: z.number().int().positive(),
});

const app = new Hono()
  .get("/", async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const rows = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, user.id))
      .orderBy(desc(wishlistItems.id));
    const ids = rows.map((r) => r.productId);
    const prods =
      ids.length > 0
        ? await db.select().from(products).where(inArray(products.id, ids))
        : [];
    const byId = new Map(prods.map((p) => [p.id, p]));
    return c.json({
      items: rows
        .map((r) => byId.get(r.productId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
      productIds: rows.map((r) => r.productId),
    });
  })
  .post("/", zValidator("json", toggleBody, validationHook), async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const { productId } = c.req.valid("json");

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) throw new NotFoundError("Product not found.");

    const [existing] = await db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, user.id),
          eq(wishlistItems.productId, productId)
        )
      );
    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return c.json({ saved: false });
    }
    await db.insert(wishlistItems).values({ userId: user.id, productId });
    return c.json({ saved: true }, 201);
  });

export type WishlistRoute = typeof app;
export default app;
