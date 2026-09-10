import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { shippingFor } from "@/lib/format";

type IncomingItem = {
  productId: number;
  size?: string | null;
  quantity: number;
};

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
    const paymentMethod = String(data.paymentMethod ?? "cod");

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

    const subtotal = lineItems.reduce((a, i) => a + i.price * i.quantity, 0);
    const shipping = shippingFor(subtotal);

    const [order] = await db
      .insert(orders)
      .values({
        customerName,
        email,
        phone,
        address,
        city,
        notes,
        paymentMethod,
        subtotal,
        shipping,
        total: subtotal + shipping,
      })
      .returning();

    await db
      .insert(orderItems)
      .values(lineItems.map((li) => ({ ...li, orderId: order.id })));

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
