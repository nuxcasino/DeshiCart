import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";
import { notifyReturnRequested } from "@/lib/notify";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

/** Customer's own return requests (newest first). */
export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const rows = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.userId, user.id))
    .orderBy(desc(returnRequests.id));
  return NextResponse.json({ returns: rows });
}

/**
 * Request a return for a delivered order. Only the order owner, only
 * delivered orders, one open request per order.
 */
export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (isRateLimited(`returns:${clientIp(request)}`, 10, 60_000)) {
    return rateLimitedResponse();
  }
  try {
    const data = await request.json();
    const orderId = Number(data.orderId);
    const reason = String(data.reason ?? "").trim().slice(0, 500);
    if (!Number.isInteger(orderId) || !reason) {
      return NextResponse.json(
        { error: "Order and reason are required." },
        { status: 400 }
      );
    }
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Only delivered orders can be returned (7-day policy)." },
        { status: 400 }
      );
    }
    const [open] = await db
      .select({ id: returnRequests.id })
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.orderId, orderId),
          eq(returnRequests.status, "requested")
        )
      )
      .limit(1);
    if (open) {
      return NextResponse.json(
        { error: "A return request is already open for this order." },
        { status: 409 }
      );
    }
    const [row] = await db
      .insert(returnRequests)
      .values({ orderId, userId: user.id, reason })
      .returning();
    await notifyReturnRequested(order);
    return NextResponse.json({ request: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
