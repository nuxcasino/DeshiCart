import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";
import { notifyReturnRequested } from "@/lib/notify";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "../errors";
import { validationHook } from "../validate";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

const createReturn = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
});

const app = new Hono()
  .get("/", async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const rows = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.userId, user.id))
      .orderBy(desc(returnRequests.id));
    return c.json({ returns: rows });
  })
  .post("/", zValidator("json", createReturn, validationHook), async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    if (isRateLimited(`returns:${clientIp(c.req.raw)}`, 10, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId));
    if (!order || order.userId !== user.id) {
      throw new NotFoundError("Order not found.");
    }
    if (order.status !== "delivered") {
      throw new ValidationError("Only delivered orders can be returned (7-day policy).");
    }
    const [open] = await db
      .select({ id: returnRequests.id })
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.orderId, input.orderId),
          eq(returnRequests.status, "requested")
        )
      )
      .limit(1);
    if (open) {
      throw new ConflictError("A return request is already open for this order.");
    }
    const [row] = await db
      .insert(returnRequests)
      .values({ orderId: input.orderId, userId: user.id, reason: input.reason })
      .returning();
    await notifyReturnRequested(order);
    return c.json({ request: row }, 201);
  });

export type ReturnsRoute = typeof app;
export default app;
