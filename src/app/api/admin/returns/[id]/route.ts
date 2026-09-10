import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";
import { initiateSslcommerzRefund, querySslcommerzRefund } from "@/lib/refunds";
import { notifyReturnUpdate } from "@/lib/notify";

/**
 * Admin return actions. Body: { action: "approve" | "reject" | "check" }
 * - approve: online-paid orders trigger a gateway refund; COD orders are
 *   marked refunded for offline cash handling.
 * - reject: closes the request.
 * - check: polls the gateway for an in-flight refund.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  const [ret] = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.id, requestId));
  if (!ret) {
    return NextResponse.json({ error: "Return request not found." }, { status: 404 });
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let action: string;
  try {
    action = String((await request.json())?.action ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "reject") {
    if (ret.status !== "requested") {
      return NextResponse.json({ error: "Request is already handled." }, { status: 400 });
    }
    await db
      .update(returnRequests)
      .set({ status: "rejected" })
      .where(eq(returnRequests.id, ret.id));
    await notifyReturnUpdate(order, "rejected");
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "check") {
    if (!order.refundRefId) {
      return NextResponse.json({ error: "No gateway refund to check." }, { status: 400 });
    }
    let query;
    try {
      query = await querySslcommerzRefund(order.refundRefId);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Refund query failed." },
        { status: 502 }
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
    return NextResponse.json({ ok: true, refund: query.status || "processing" });
  }

  if (action === "approve") {
    if (ret.status !== "requested") {
      return NextResponse.json({ error: "Request is already handled." }, { status: 400 });
    }
    // COD / non-gateway orders: cash is handled offline.
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
      return NextResponse.json({ ok: true, status: "refunded", manual: true });
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
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Refund request failed." },
        { status: 502 }
      );
    }
    if (!refund.ok || !refund.refundRefId) {
      return NextResponse.json(
        { error: refund.errorReason || "Refund was not accepted." },
        { status: 502 }
      );
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
    return NextResponse.json({ ok: true, status: "approved" });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
