import { describe, expect, it } from "vitest";
import { calcDiscount } from "@/lib/coupons";
import type { Coupon } from "@/db/schema";

function coupon(over: Partial<Coupon>): Coupon {
  return {
    id: 1,
    code: "TEST",
    type: "flat",
    value: 100,
    minSubtotal: 0,
    maxUses: null,
    usedCount: 0,
    active: true,
    expiresAt: null,
    createdAt: new Date(),
    ...over,
  };
}

describe("calcDiscount", () => {
  it("applies flat discounts capped at the subtotal", () => {
    expect(calcDiscount(coupon({ value: 200 }), 1000)).toBe(200);
    expect(calcDiscount(coupon({ value: 2000 }), 1000)).toBe(1000);
  });
  it("applies percent discounts rounded down", () => {
    expect(calcDiscount(coupon({ type: "percent", value: 10 }), 999)).toBe(99);
    expect(calcDiscount(coupon({ type: "percent", value: 100 }), 500)).toBe(500);
  });
  it("never goes negative", () => {
    expect(calcDiscount(coupon({ value: 0 }), 500)).toBe(0);
  });
});
