import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { releaseStock } from "./stock";
import {
  querySslcommerzTransaction,
  validateSslcommerzTransaction,
} from "./sslcommerz";

export type SettleResult =
  | { outcome: "paid"; orderId: number }
  | { outcome: "failed"; orderId: number | null };

/**
 * Verifies a gateway callback server-side (Order Validation API) and settles
 * the matching pending order. Idempotent: re-deliveries of an already-paid
 * order are no-ops. Failed payments release the reserved stock.
 */
export async function settleOrderPayment(
  tranId: string,
  valId: string | null
): Promise<SettleResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.transactionId, tranId));
  if (!order) return { outcome: "failed", orderId: null };
  if (order.paymentStatus === "paid") {
    return { outcome: "paid", orderId: order.id };
  }

  const fail = async (): Promise<SettleResult> => {
    if (order.paymentStatus === "pending") {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      await releaseStock(items);
      await db
        .update(orders)
        .set({ paymentStatus: "failed", status: "cancelled" })
        .where(eq(orders.id, order.id));
    }
    return { outcome: "failed", orderId: order.id };
  };

  if (!valId) return fail();

  let check;
  try {
    check = await validateSslcommerzTransaction(valId);
  } catch {
    return fail();
  }

  const amountOk = Number.isFinite(check.amount)
    ? Math.abs(check.amount - order.total) < 0.01
    : false;
  if (
    !check.valid ||
    check.tranId !== tranId ||
    check.currency !== "BDT" ||
    !amountOk
  ) {
    return fail();
  }

  await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      status: "confirmed",
      gatewayValId: valId,
      bankTranId: check.bankTranId || null,
      cardInfo: check.cardInfo || null,
      riskLevel: check.riskLevel,
      storeAmount: check.storeAmount || null,
    })
    .where(eq(orders.id, order.id));
  return { outcome: "paid", orderId: order.id };
}

export type ReconcileResult = {
  outcome: "paid" | "pending" | "failed" | "not-found";
  orderId: number | null;
};

/**
 * Reconciles a `pending` order against the gateway's Transaction Query API —
 * for customers who paid but never returned to the site (abandoned tab,
 * connectivity loss). Terminal (failed/cancelled) orders are never touched.
 */
export async function reconcileOrderPayment(
  tranId: string
): Promise<ReconcileResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.transactionId, tranId));
  if (!order) return { outcome: "not-found", orderId: null };
  if (order.paymentStatus === "paid") {
    return { outcome: "paid", orderId: order.id };
  }
  if (order.paymentStatus !== "pending") {
    return { outcome: "failed", orderId: order.id };
  }

  let attempts;
  try {
    attempts = await querySslcommerzTransaction(tranId);
  } catch {
    return { outcome: "pending", orderId: order.id };
  }
  const successful = attempts.find(
    (el) =>
      (el.status === "VALID" || el.status === "VALIDATED") && el.valId
  );
  if (!successful) return { outcome: "pending", orderId: order.id };

  // Re-verify through the standard path so amount/currency checks apply.
  const settled = await settleOrderPayment(tranId, successful.valId);
  return settled.outcome === "paid"
    ? { outcome: "paid", orderId: order.id }
    : { outcome: "pending", orderId: order.id };
}
