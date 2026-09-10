import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { releaseStock } from "./stock";
import { validateSslcommerzTransaction } from "./sslcommerz";

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
    .set({ paymentStatus: "paid", status: "confirmed" })
    .where(eq(orders.id, order.id));
  return { outcome: "paid", orderId: order.id };
}
