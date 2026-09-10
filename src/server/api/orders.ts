import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSessionUserFromRequest, isValidEmail } from "@/lib/auth";
import { applyCoupon, releaseCoupon } from "@/lib/coupons";
import { shippingForCity } from "@/lib/shipping";
import { findInsufficientStock, releaseStock, reserveStock } from "@/lib/stock";
import { notifyOrderPlaced } from "@/lib/notify";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";
import { validationHook } from "../validate";

const item = z.object({
  productId: z.number().int().positive(),
  size: z.string().max(20).nullable().optional(),
  quantity: z.number().int().default(1),
});

const createOrder = z.object({
  customerName: z.string().trim().min(1).max(80),
  email: z.string().trim().max(160).refine(isValidEmail, "Invalid email."),
  phone: z.string().trim().min(1).max(20),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(500).default(""),
  paymentMethod: z.string().trim().max(30).default("cod"),
  couponCode: z.string().trim().max(40).default(""),
  items: z.array(item).min(1).max(50),
});

const app = new Hono().post("/", zValidator("json", createOrder, validationHook), async (c) => {
  if (isRateLimited(`orders:${clientIp(c.req.raw)}`, 10, 60_000)) {
    return rateLimitedResponse();
  }
  const input = c.req.valid("json");

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const dbProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lineItems = input.items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name,
        image: p.images[0] ?? "",
        price: p.price,
        size: i.size ?? null,
        quantity: Math.min(10, Math.max(1, i.quantity || 1)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (!lineItems.length) {
    return c.json({ error: "No valid items" }, 400);
  }

  const insufficient = findInsufficientStock(
    lineItems,
    new Map(dbProducts.map((p) => [p.id, p.stock]))
  );
  if (insufficient.length > 0) {
    return c.json(
      { error: "Some items don't have enough stock", items: insufficient },
      409
    );
  }

  const subtotal = lineItems.reduce((a, i) => a + i.price * i.quantity, 0);

  const couponCode = input.couponCode.toUpperCase() || null;
  let discount = 0;
  if (couponCode) {
    const applied = await applyCoupon(couponCode, subtotal);
    if (!applied.ok) {
      return c.json({ error: applied.error }, 409);
    }
    discount = applied.discount;
  }
  const shipping = await shippingForCity(input.city, subtotal - discount);

  const sessionUser = await getSessionUserFromRequest(c.req.raw);

  const reserved = await reserveStock(lineItems);
  if (!reserved.ok) {
    if (couponCode) await releaseCoupon(couponCode);
    return c.json(
      { error: "Some items just sold out", items: [reserved.failed] },
      409
    );
  }

  try {
    const [order] = await db
      .insert(orders)
      .values({
        userId: sessionUser?.id ?? null,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        notes: input.notes || null,
        paymentMethod: input.paymentMethod,
        subtotal,
        discount,
        couponCode,
        shipping,
        total: subtotal - discount + shipping,
      })
      .returning();

    await db
      .insert(orderItems)
      .values(lineItems.map((li) => ({ ...li, orderId: order.id })));

    await notifyOrderPlaced(order, lineItems);

    return c.json({ orderId: order.id }, 201);
  } catch {
    await releaseStock(lineItems);
    if (couponCode) await releaseCoupon(couponCode);
    return c.json({ error: "Could not place order. Please try again." }, 500);
  }
});

export type OrdersRoute = typeof app;
export default app;
