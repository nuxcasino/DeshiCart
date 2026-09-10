import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getSessionUserFromRequest, isValidEmail } from "@/lib/auth";
import { applyCoupon, releaseCoupon } from "@/lib/coupons";
import { shippingForCity } from "@/lib/shipping";
import {
  releaseLines,
  reserveLines,
  resolveCheckoutLines,
} from "@/lib/checkout-lines";
import { notifyOrderPlaced } from "@/lib/notify";
import { validationHook } from "../validate";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

const item = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
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

  // Authoritative pricing: variants when present, else product rows.
  const { lineItems, insufficient } = await resolveCheckoutLines(input.items);
  if (!lineItems.length) {
    return c.json({ error: "No valid items" }, 400);
  }
  if (insufficient.length > 0) {
    return c.json(
      {
        error: "Some items don't have enough stock",
        items: insufficient.map(({ productId, name, available }) => ({
          productId,
          name,
          available,
        })),
      },
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

  const reserved = await reserveLines(lineItems);
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

    await db.insert(orderItems).values(
      lineItems.map((li) => ({
        orderId: order.id,
        productId: li.productId,
        variantId: li.variantId,
        sku: li.sku,
        name: li.name,
        image: li.image,
        price: li.price,
        size: li.size,
        quantity: li.quantity,
      }))
    );

    await notifyOrderPlaced(order, lineItems);

    return c.json({ orderId: order.id }, 201);
  } catch {
    await releaseLines(lineItems);
    if (couponCode) await releaseCoupon(couponCode);
    return c.json({ error: "Could not place order. Please try again." }, 500);
  }
});

export type OrdersRoute = typeof app;
export default app;
