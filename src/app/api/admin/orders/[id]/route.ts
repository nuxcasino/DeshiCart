import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }
  try {
    const data = await request.json();
    const patch: Partial<{ status: string; paymentStatus: string }> = {};
    if (typeof data.status === "string" && STATUSES.includes(data.status)) {
      patch.status = data.status;
    }
    if (
      typeof data.paymentStatus === "string" &&
      PAYMENT_STATUSES.includes(data.paymentStatus)
    ) {
      patch.paymentStatus = data.paymentStatus;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const [updated] = await db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
