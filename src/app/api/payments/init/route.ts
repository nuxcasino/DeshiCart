import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { shippingFor } from "@/lib/format";
import { findInsufficientStock, reserveStock } from "@/lib/stock";
import { getSiteUrl, initSslcommerzPayment } from "@/lib/sslcommerz";
import { getSessionUserFromRequest } from "@/lib/auth";

type IncomingItem = {
  productId: number;
  size?: string | null;
  quantity: number;
};

/**
 * Starts an SSLCommerz online payment: validates the cart, reserves stock,
 * creates a `pending` order, and returns the gateway URL to redirect to.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const items: IncomingItem[] = Array.isArray(data.items) ? data.items : [];
    const customerName = String(data.customerName ?? "").trim();
    const email = String(data.email ?? "").trim();
    const phone = String(data.phone ?? "").trim();
    const address = String(data.address ?? "").trim();
    const city = String(data.city ?? "").trim();
    const notes = String(data.notes ?? "").trim() || null;
    // Postcode isn't stored on the order — it only satisfies the gateway's
    // mandatory cus_postcode / ship_postcode fields.
    const postcode = String(data.postcode ?? "").trim() || "1200";

    if (!items.length || !customerName || !phone || !address || !city || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ids = [...new Set(items.map((i) => Number(i.productId)))].filter(Boolean);
    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, ids));
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    const lineItems = items
      .map((i) => {
        const p = byId.get(Number(i.productId));
        if (!p) return null;
        const quantity = Math.min(10, Math.max(1, Number(i.quantity) || 1));
        return {
          productId: p.id,
          name: p.name,
          image: p.images[0] ?? "",
          price: p.price,
          size: i.size ?? null,
          quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (!lineItems.length) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 });
    }

    const insufficient = findInsufficientStock(
      lineItems,
      new Map(dbProducts.map((p) => [p.id, p.stock]))
    );
    if (insufficient.length > 0) {
      return NextResponse.json(
        {
          error: "Some items don't have enough stock",
          items: insufficient,
        },
        { status: 409 }
      );
    }

    const subtotal = lineItems.reduce((a, i) => a + i.price * i.quantity, 0);
    const shipping = shippingFor(subtotal);
    const total = subtotal + shipping;

    const reserved = await reserveStock(lineItems);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Some items just sold out", items: [reserved.failed] },
        { status: 409 }
      );
    }

    const tranId = `DC-${Date.now()}`;
    let orderId: number;
    try {
      const sessionUser = await getSessionUserFromRequest(request);
      const [order] = await db
        .insert(orders)
        .values({
          userId: sessionUser?.id ?? null,
          customerName,
          email,
          phone,
          address,
          city,
          notes,
          paymentMethod: "sslcommerz",
          subtotal,
          shipping,
          total,
          status: "pending",
          paymentStatus: "pending",
          transactionId: tranId,
        })
        .returning();
      orderId = order.id;
      await db
        .insert(orderItems)
        .values(lineItems.map((li) => ({ ...li, orderId: order.id })));
    } catch {
      const { releaseStock } = await import("@/lib/stock");
      await releaseStock(lineItems);
      return NextResponse.json(
        { error: "Could not start payment. Please try again." },
        { status: 500 }
      );
    }

    const siteUrl = getSiteUrl(request);
    try {
      const gatewayUrl = await initSslcommerzPayment({
        tranId,
        total,
        customerName,
        email,
        phone,
        address,
        city,
        postcode,
        siteUrl,
        productNames: lineItems.map((li) => li.name).join(", "),
      });
      return NextResponse.json({ orderId, gatewayUrl });
    } catch (error) {
      // Gateway unreachable — cancel the pending order and release stock.
      const { releaseStock } = await import("@/lib/stock");
      await releaseStock(lineItems);
      await db
        .update(orders)
        .set({ paymentStatus: "failed", status: "cancelled" })
        .where(eq(orders.id, orderId));
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not start payment. Please try again.",
        },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
