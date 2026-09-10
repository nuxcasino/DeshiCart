import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { shippingFor } from "@/lib/format";
import { getSessionUserFromRequest, isValidEmail } from "@/lib/auth";
import { notifyOrderPlaced } from "@/lib/notify";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

type IncomingItem = {
  productId: number;
  size?: string | null;
  quantity: number;
};

export async function POST(request: Request) {
  if (isRateLimited(`orders:${clientIp(request)}`, 10, 60_000)) {
    return rateLimitedResponse();
  }
  try {
    const data = await request.json();
    const items: IncomingItem[] = Array.isArray(data.items)
      ? data.items.slice(0, 50)
      : [];
    const customerName = String(data.customerName ?? "").trim().slice(0, 80);
    const email = String(data.email ?? "").trim().slice(0, 160);
    const phone = String(data.phone ?? "").trim().slice(0, 20);
    const address = String(data.address ?? "").trim().slice(0, 200);
    const city = String(data.city ?? "").trim().slice(0, 60);
    const notes = String(data.notes ?? "").trim().slice(0, 500) || null;
    const paymentMethod = String(data.paymentMethod ?? "cod").slice(0, 30);

    if (
      !items.length ||
      !customerName ||
      !phone ||
      !address ||
      !city ||
      !isValidEmail(email)
    ) {
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
          size: typeof i.size === "string" ? i.size.slice(0, 20) : null,
          quantity,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (!lineItems.length) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 });
    }

    // Friendly pre-check against the freshly-read stock snapshot.
    // The conditional UPDATE below is the real guard against checkout races.
    const insufficient = lineItems
      .map((li) => ({
        productId: li.productId,
        name: li.name,
        available: byId.get(li.productId)?.stock ?? 0,
        requested: li.quantity,
      }))
      .filter((x) => x.requested > x.available);
    if (insufficient.length > 0) {
      return NextResponse.json(
        {
          error: "Some items don't have enough stock",
          items: insufficient.map(({ productId, name, available }) => ({
            productId,
            name,
            available,
          })),
        },
        { status: 409 }
      );
    }

    const subtotal = lineItems.reduce((a, i) => a + i.price * i.quantity, 0);
    const shipping = shippingFor(subtotal);

    // Link the order to the account when the customer is logged in.
    const sessionUser = await getSessionUserFromRequest(request);

    // Reserve stock before creating the order. Each decrement is conditional
    // (stock >= quantity) so concurrent checkouts can't oversell. The Neon
    // HTTP driver has no interactive transactions, so on a lost race we
    // compensate by restoring the rows already reserved.
    const reserved: typeof lineItems = [];
    for (const li of lineItems) {
      const updated = await db
        .update(products)
        .set({ stock: sql`${products.stock} - ${li.quantity}` })
        .where(
          and(eq(products.id, li.productId), gte(products.stock, li.quantity))
        )
        .returning();
      if (updated.length === 0) {
        for (const done of reserved) {
          await db
            .update(products)
            .set({ stock: sql`${products.stock} + ${done.quantity}` })
            .where(eq(products.id, done.productId));
        }
        return NextResponse.json(
          {
            error: "Some items just sold out",
            items: [{ productId: li.productId, name: li.name, available: 0 }],
          },
          { status: 409 }
        );
      }
      reserved.push(li);
    }

    try {
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
          paymentMethod,
          subtotal,
          shipping,
          total: subtotal + shipping,
        })
        .returning();

      await db
        .insert(orderItems)
        .values(lineItems.map((li) => ({ ...li, orderId: order.id })));

      await notifyOrderPlaced(order, lineItems);

      return NextResponse.json({ orderId: order.id }, { status: 201 });
    } catch {
      // Order insert failed after reservation — release the reserved stock.
      for (const done of reserved) {
        await db
          .update(products)
          .set({ stock: sql`${products.stock} + ${done.quantity}` })
          .where(eq(products.id, done.productId));
      }
      return NextResponse.json(
        { error: "Could not place order. Please try again." },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
