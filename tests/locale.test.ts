import { describe, expect, it } from "vitest";
import {
  isLocale,
  lp,
  pick,
  pickList,
  switchLocalePath,
} from "@/lib/locale";

describe("lp", () => {
  it("prefixes root-absolute paths", () => {
    expect(lp("bn", "/shop")).toBe("/bn/shop");
    expect(lp("en", "/")).toBe("/en");
    expect(lp("bn", "/product/x?y=1")).toBe("/bn/product/x?y=1");
  });
});

describe("switchLocalePath", () => {
  it("swaps an existing prefix", () => {
    expect(switchLocalePath("/bn/shop", "en")).toBe("/en/shop");
    expect(switchLocalePath("/en", "bn")).toBe("/bn");
  });
  it("prefixes unprefixed paths", () => {
    expect(switchLocalePath("/shop", "bn")).toBe("/bn/shop");
  });
});

describe("isLocale", () => {
  it("accepts bn/en only", () => {
    expect(isLocale("bn")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("pick", () => {
  const row = { name: "Tee", nameBn: "টি", tagline: "Hi", taglineBn: "  " };
  it("returns Bangla when present", () => {
    expect(pick("bn", row, "name")).toBe("টি");
  });
  it("falls back to English on blank Bangla", () => {
    expect(pick("bn", row, "tagline")).toBe("Hi");
  });
  it("returns English for en", () => {
    expect(pick("en", row, "name")).toBe("Tee");
  });
});

describe("pickList", () => {
  it("returns the Bangla list when non-empty", () => {
    expect(pickList("bn", { d: ["a"], dBn: ["অ"] }, "d")).toEqual(["অ"]);
  });
  it("falls back to English on empty Bangla", () => {
    expect(pickList("bn", { d: ["a"], dBn: [] }, "d")).toEqual(["a"]);
  });
});
