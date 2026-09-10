import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { releaseStock } from "@/lib/stock";
import { getSiteUrl } from "@/lib/sslcommerz";

/** Customer returns here after cancelling at the gateway. Releases reserved stock. */
export async function POST(request: Request) {
  const siteUrl = getSiteUrl(request);
  try {
    const form = await request.formData();
    const tranId = String(form.get("tran_id") ?? "");
    if (tranId) {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.transactionId, tranId));
      if (order && order.paymentStatus === "pending") {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        await releaseStock(items);
        await db
          .update(orders)
          .set({ paymentStatus: "cancelled", status: "cancelled" })
          .where(eq(orders.id, order.id));
      }
    }
  } catch {
    // fall through to the redirect
  }
  return NextResponse.redirect(`${siteUrl}/checkout?error=payment-cancelled`, 303);
}
