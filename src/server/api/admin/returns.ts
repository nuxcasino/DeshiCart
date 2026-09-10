import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";
import { initiateSslcommerzRefund, querySslcommerzRefund } from "@/lib/refunds";
import { notifyReturnUpdate } from "@/lib/notify";

const actionBody = z.object({
  action: z.enum(["approve", "reject", "check"]),
});

const app = new Hono().post(
  "/:id",
  zValidator("json", actionBody, validationHook),
  async (c) => {
    await requireAdminRequest(c.req.raw);
    const requestId = Number(c.req.param("id"));
    if (!Number.isInteger(requestId)) {
      return c.json({ error: "Invalid request id." }, 400);
    }

    const [ret] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, requestId));
    if (!ret) throw new NotFoundError("Return request not found.");
    const [order] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
    if (!order) throw new NotFoundError("Order not found.");

    const action = c.req.valid("json").action;

    if (action === "reject") {
      if (ret.status !== "requested") {
        return c.json({ error: "Request is already handled." }, 400);
      }
      await db
        .update(returnRequests)
        .set({ status: "rejected" })
        .where(eq(returnRequests.id, ret.id));
      await notifyReturnUpdate(order, "rejected");
      return c.json({ ok: true, status: "rejected" });
    }

    if (action === "check") {
      if (!order.refundRefId) {
        return c.json({ error: "No gateway refund to check." }, 400);
      }
      let query;
      try {
        query = await querySslcommerzRefund(order.refundRefId);
      } catch (e) {
        return c.json(
          { error: e instanceof Error ? e.message : "Refund query failed." },
          502
        );
      }
      if (query.status === "refunded") {
        await db
          .update(orders)
          .set({ refundStatus: "refunded", paymentStatus: "refunded" })
          .where(eq(orders.id, order.id));
        await db
          .update(returnRequests)
          .set({ status: "refunded" })
          .where(eq(returnRequests.id, ret.id));
        await notifyReturnUpdate(order, "refunded");
      } else if (query.status === "cancelled") {
        await db
          .update(orders)
          .set({ refundStatus: "cancelled" })
          .where(eq(orders.id, order.id));
      }
      return c.json({ ok: true, refund: query.status || "processing" });
    }

    // approve
    if (ret.status !== "requested") {
      return c.json({ error: "Request is already handled." }, 400);
    }
    if (!order.bankTranId) {
      await db
        .update(orders)
        .set({ refundStatus: "refunded", paymentStatus: "refunded" })
        .where(eq(orders.id, order.id));
      await db
        .update(returnRequests)
        .set({ status: "refunded" })
        .where(eq(returnRequests.id, ret.id));
      await notifyReturnUpdate(order, "refunded");
      return c.json({ ok: true, status: "refunded", manual: true });
    }
    const refundTransId = `RF${order.id}-${Date.now()}`.slice(0, 30);
    let refund;
    try {
      refund = await initiateSslcommerzRefund({
        bankTranId: order.bankTranId,
        refundTransId,
        amount: order.total,
        remarks: ret.reason.slice(0, 255) || `Return ${order.id}`,
      });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : "Refund request failed." },
        502
      );
    }
    if (!refund.ok || !refund.refundRefId) {
      return c.json({ error: refund.errorReason || "Refund was not accepted." }, 502);
    }
    await db
      .update(orders)
      .set({
        refundStatus: "processing",
        refundRefId: refund.refundRefId,
        refundAmount: order.total,
      })
      .where(eq(orders.id, order.id));
    await db
      .update(returnRequests)
      .set({ status: "approved" })
      .where(eq(returnRequests.id, ret.id));
    await notifyReturnUpdate(order, "approved");
    return c.json({ ok: true, status: "approved" });
  }
);

export type AdminReturnsRoute = typeof app;
export default app;
