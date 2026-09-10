import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

const optionalDate = z
  .string()
  .trim()
  .refine((s) => s === "" || !Number.isNaN(new Date(s).getTime()), "Invalid expiry date.");

const nullablePositiveInt = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.union([z.coerce.number().int().positive(), z.null()])
);

const createCoupon = z.object({
  code: z.string().trim().min(1).max(40),
  type: z.enum(["flat", "percent"]).default("flat"),
  value: z.coerce.number().int().min(1),
  minSubtotal: z.coerce.number().int().min(0).default(0),
  maxUses: nullablePositiveInt.default(null),
  active: z.boolean().default(true),
  expiresAt: optionalDate.default(""),
});

const updateCoupon = z.object({
  type: z.enum(["flat", "percent"]).optional(),
  value: z.coerce.number().int().min(1).optional(),
  minSubtotal: z.coerce.number().int().min(0).optional(),
  maxUses: nullablePositiveInt.optional(),
  active: z.boolean().optional(),
  expiresAt: optionalDate.optional(),
});

const toDateOrNull = (s: string) => (s ? new Date(s) : null);

const app = new Hono()
  .get("/", async (c) => {
    await requireAdminRequest(c.req.raw);
    const rows = await db.select().from(coupons).orderBy(desc(coupons.id));
    return c.json({ coupons: rows });
  })
  .post("/", zValidator("json", createCoupon, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const input = c.req.valid("json");
    try {
      const [row] = await db
        .insert(coupons)
        .values({
          code: input.code.toUpperCase(),
          type: input.type,
          value: input.value,
          minSubtotal: input.minSubtotal,
          maxUses: input.maxUses,
          active: input.active,
          expiresAt: toDateOrNull(input.expiresAt),
        })
        .returning();
      return c.json({ coupon: row }, 201);
    } catch (e) {
      if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
        return c.json({ error: "Code already exists." }, 409);
      }
      throw e;
    }
  })
  .patch("/:id", zValidator("json", updateCoupon, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const couponId = Number(c.req.param("id"));
    if (!Number.isInteger(couponId)) {
      return c.json({ error: "Invalid coupon id." }, 400);
    }
    const input = c.req.valid("json");
    const values: Record<string, unknown> = {};
    if (input.type !== undefined) values.type = input.type;
    if (input.value !== undefined) values.value = input.value;
    if (input.minSubtotal !== undefined) values.minSubtotal = input.minSubtotal;
    if (input.maxUses !== undefined) values.maxUses = input.maxUses;
    if (input.active !== undefined) values.active = input.active;
    if (input.expiresAt !== undefined) values.expiresAt = toDateOrNull(input.expiresAt);
    if (Object.keys(values).length === 0) {
      return c.json({ error: "Nothing to update." }, 400);
    }
    const [updated] = await db
      .update(coupons)
      .set(values)
      .where(eq(coupons.id, couponId))
      .returning();
    if (!updated) throw new NotFoundError("Coupon not found.");
    return c.json({ coupon: updated });
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const couponId = Number(c.req.param("id"));
    if (!Number.isInteger(couponId)) {
      return c.json({ error: "Invalid coupon id." }, 400);
    }
    const deleted = await db
      .delete(coupons)
      .where(eq(coupons.id, couponId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Coupon not found.");
    return c.json({ ok: true });
  });

export type AdminCouponsRoute = typeof app;
export default app;
