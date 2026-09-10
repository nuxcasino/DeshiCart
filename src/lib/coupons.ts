import { db } from "@/db";
import { coupons, type Coupon } from "@/db/schema";
import { and, eq, isNull, or, gt, sql } from "drizzle-orm";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

function calcDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percent"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  return Math.max(0, Math.min(raw, subtotal));
}

function checkUsable(coupon: Coupon, subtotal: number): string | null {
  if (!coupon.active) return "This coupon is no longer active.";
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return "This coupon has expired.";
  }
  if (subtotal < coupon.minSubtotal) {
    return `This coupon needs a minimum order of ৳${coupon.minSubtotal.toLocaleString("en-IN")}.`;
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return "This coupon has reached its usage limit.";
  }
  return null;
}

/** Validate without consuming (used by the checkout preview). */
export async function previewCoupon(
  code: string,
  subtotal: number
): Promise<CouponCheck> {
  const normalized = code.trim().toUpperCase().slice(0, 40);
  if (!normalized) return { ok: false, error: "Enter a coupon code." };
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalized));
  if (!coupon) return { ok: false, error: "Coupon not found." };
  const problem = checkUsable(coupon, subtotal);
  if (problem) return { ok: false, error: problem };
  return { ok: true, coupon, discount: calcDiscount(coupon, subtotal) };
}

/**
 * Validate AND atomically consume one use. The increment is conditional on
 * remaining uses, so concurrent checkouts can't overshoot maxUses.
 */
export async function applyCoupon(
  code: string,
  subtotal: number
): Promise<CouponCheck> {
  const preview = await previewCoupon(code, subtotal);
  if (!preview.ok) return preview;
  const { coupon } = preview;

  if (coupon.maxUses === null) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.id, coupon.id));
  } else {
    const updated = await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(
        and(
          eq(coupons.id, coupon.id),
          or(isNull(coupons.maxUses), gt(coupons.maxUses, coupons.usedCount))
        )
      )
      .returning();
    if (updated.length === 0) {
      return { ok: false, error: "This coupon has reached its usage limit." };
    }
  }
  return { ...preview, discount: calcDiscount(coupon, subtotal) };
}

/** Best-effort release of a consumed use (order/payment failed afterwards). */
export async function releaseCoupon(code: string): Promise<void> {
  try {
    await db
      .update(coupons)
      .set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` })
      .where(eq(coupons.code, code.trim().toUpperCase()));
  } catch {
    // hygiene only
  }
}
