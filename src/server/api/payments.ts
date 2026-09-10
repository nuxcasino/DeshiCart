import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUserFromRequest, isValidEmail } from "@/lib/auth";
import { applyCoupon, releaseCoupon } from "@/lib/coupons";
import { quoteShipping } from "@/lib/locations";
import {
  releaseLines,
  reserveLines,
  resolveCheckoutLines,
} from "@/lib/checkout-lines";
import { getSiteUrl, initSslcommerzPayment } from "@/lib/sslcommerz";
import { reconcileOrderPayment, settleOrderPayment } from "@/lib/payments";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";
import { validationHook } from "../validate";

const item = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  size: z.string().max(20).nullable().optional(),
  quantity: z.number().int().default(1),
});

const initPayment = z.object({
  customerName: z.string().trim().min(1).max(80),
  email: z.string().trim().max(160).refine(isValidEmail, "Invalid email."),
  phone: z.string().trim().min(1).max(20),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(500).default(""),
  postcode: z.string().trim().max(20).default(""),
  couponCode: z.string().trim().max(40).default(""),
  divisionId: z.string().trim().max(20).default(""),
  districtId: z.string().trim().max(20).default(""),
  upazilaId: z.string().trim().max(20).default(""),
  paymentMethod: z.string().trim().max(30).default("sslcommerz"),
  items: z.array(item).min(1).max(50),
});

const reconcileBody = z.object({
  tranId: z.string().trim().min(1).max(60),
});

const app = new Hono()
  .post("/init", zValidator("json", initPayment, validationHook), async (c) => {
    if (isRateLimited(`pay-init:${clientIp(c.req.raw)}`, 10, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");

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
    const shipping = await quoteShipping({
      city: input.city,
      divisionId: input.divisionId || null,
      districtId: input.districtId || null,
      upazilaId: input.upazilaId || null,
      subtotal: subtotal - discount,
    });
    const total = subtotal - discount + shipping;

    const reserved = await reserveLines(lineItems);
    if (!reserved.ok) {
      if (couponCode) await releaseCoupon(couponCode);
      return c.json(
        { error: "Some items just sold out", items: [reserved.failed] },
        409
      );
    }

    const tranId = `DC-${Date.now()}`;
    let orderId: number;
    try {
      const sessionUser = await getSessionUserFromRequest(c.req.raw);
      const [order] = await db
        .insert(orders)
        .values({
          userId: sessionUser?.id ?? null,
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          divisionId: input.divisionId || null,
          districtId: input.districtId || null,
          upazilaId: input.upazilaId || null,
          notes: input.notes || null,
          paymentMethod: "sslcommerz",
          subtotal,
          discount,
          couponCode,
          shipping,
          total,
          status: "pending",
          paymentStatus: "pending",
          transactionId: tranId,
        })
        .returning();
      orderId = order.id;
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
    } catch {
      await releaseLines(lineItems);
      if (couponCode) await releaseCoupon(couponCode);
      return c.json({ error: "Could not start payment. Please try again." }, 500);
    }

    const siteUrl = getSiteUrl(c.req.raw);
    try {
      const gatewayUrl = await initSslcommerzPayment({
        tranId,
        total,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        postcode: input.postcode || "1200",
        siteUrl,
        productNames: lineItems.map((li) => li.name).join(", "),
      });
      return c.json({ orderId, gatewayUrl });
    } catch (error) {
      await releaseLines(lineItems);
      if (couponCode) await releaseCoupon(couponCode);
      await db
        .update(orders)
        .set({ paymentStatus: "failed", status: "cancelled" })
        .where(eq(orders.id, orderId));
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not start payment. Please try again.",
        },
        502
      );
    }
  })
  .post("/success", async (c) => {
    const siteUrl = getSiteUrl(c.req.raw);
    try {
      const form = await c.req.parseBody();
      const tranId = String(form["tran_id"] ?? "");
      const valId = form["val_id"] ? String(form["val_id"]) : null;
      if (!tranId) {
        return c.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
      }
      const result = await settleOrderPayment(tranId, valId);
      if (result.outcome === "paid") {
        return c.redirect(`${siteUrl}/order/${result.orderId}`, 303);
      }
      return c.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
    } catch {
      return c.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
    }
  })
  .post("/fail", async (c) => {
    const siteUrl = getSiteUrl(c.req.raw);
    await settleFailedCallback(() => c.req.parseBody(), "failed");
    return c.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
  })
  .post("/cancel", async (c) => {
    const siteUrl = getSiteUrl(c.req.raw);
    await settleFailedCallback(() => c.req.parseBody(), "cancelled");
    return c.redirect(`${siteUrl}/checkout?error=payment-cancelled`, 303);
  })
  .post("/ipn", async (c) => {
    try {
      const form = await c.req.parseBody();
      const tranId = String(form["tran_id"] ?? "");
      const valId = form["val_id"] ? String(form["val_id"]) : null;
      if (!tranId) return c.json({ ok: false }, 400);
      const result = await settleOrderPayment(tranId, valId);
      return c.json({ ok: result.outcome === "paid" });
    } catch {
      return c.json({ ok: false }, 400);
    }
  })
  .post("/reconcile", zValidator("json", reconcileBody, validationHook), async (c) => {
    const { tranId } = c.req.valid("json");
    const { reconcileOrderPayment } = await import("@/lib/payments");
    return c.json(await reconcileOrderPayment(tranId));
  });

/** Shared fail/cancel logic: release reservation, mark closed. */
async function settleFailedCallback(
  parseBody: () => Promise<Record<string, string | File>>,
  paymentStatus: "failed" | "cancelled"
) {
  try {
    const form = await parseBody();
    const tranId = String(form["tran_id"] ?? "");
    if (!tranId) return;
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.transactionId, tranId));
    if (!order || order.paymentStatus !== "pending") return;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    await releaseLines(items);
    await db
      .update(orders)
      .set({ paymentStatus, status: "cancelled" })
      .where(eq(orders.id, order.id));
  } catch {
    // fall through to the redirect
  }
}

export type PaymentsRoute = typeof app;
export default app;
