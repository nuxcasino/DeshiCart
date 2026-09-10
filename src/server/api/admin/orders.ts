import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";
import { notifyStatusChange } from "@/lib/notify";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"] as const;

const updateOrder = z.object({
  status: z.enum(STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

const app = new Hono().patch(
  "/:id",
  zValidator("json", updateOrder, validationHook),
  async (c) => {
    await requireAdminRequest(c.req.raw);
    const orderId = Number(c.req.param("id"));
    if (!Number.isInteger(orderId)) {
      return c.json({ error: "Invalid order id." }, 400);
    }
    const input = c.req.valid("json");
    if (input.status === undefined && input.paymentStatus === undefined) {
      return c.json({ error: "Nothing to update." }, 400);
    }

    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!existing) throw new NotFoundError("Order not found.");

    const [updated] = await db
      .update(orders)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
      })
      .where(eq(orders.id, orderId))
      .returning();
    if (!updated) throw new NotFoundError("Order not found.");

    if (input.status !== undefined && input.status !== existing.status) {
      await notifyStatusChange(updated, existing.status, input.status);
    }
    return c.json({ order: updated });
  }
);

export type AdminOrdersRoute = typeof app;
export default app;
