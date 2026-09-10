import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  formatBDT,
  shippingFor,
} from "@/lib/format";

describe("formatBDT", () => {
  it("formats with the taka sign and grouping", () => {
    expect(formatBDT(890)).toBe("৳890");
    expect(formatBDT(3000)).toBe("৳3,000");
    expect(formatBDT(11550)).toBe("৳11,550");
  });
});

describe("shippingFor", () => {
  it("is free for an empty bag", () => {
    expect(shippingFor(0)).toBe(0);
  });
  it("charges flat below the threshold", () => {
    expect(shippingFor(1)).toBe(SHIPPING_FLAT);
    expect(shippingFor(FREE_SHIPPING_THRESHOLD - 1)).toBe(SHIPPING_FLAT);
  });
  it("is free at and above the threshold", () => {
    expect(shippingFor(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(shippingFor(FREE_SHIPPING_THRESHOLD + 500)).toBe(0);
  });
});
