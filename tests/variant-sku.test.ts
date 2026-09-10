import { describe, expect, it } from "vitest";
import { suggestSku } from "@/lib/variant-sku";

describe("suggestSku", () => {
  it("builds P<id>-COLOR-SIZE SKUs", () => {
    expect(suggestSku(42, "Black", "XL")).toBe("P42-BLACK-XL");
  });
  it("strips non-alphanumerics and caps length", () => {
    expect(suggestSku(7, "Jet Black!", "One Size")).toBe("P7-JETBLACK-ONESIZE");
  });
  it("falls back to STD on empty parts", () => {
    expect(suggestSku(3, "", "")).toBe("P3-STD-STD");
  });
});
