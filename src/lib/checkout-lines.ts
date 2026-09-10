import { db } from "@/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { findInsufficientStock, releaseStock, reserveStock } from "./stock";
import {
  getVariantsForProducts,
  releaseVariantStock,
  reserveVariantStock,
} from "./variants";

export type RawLine = {
  productId: number;
  variantId?: number | null;
  size?: string | null;
  quantity: number;
};

export type PricedLine = {
  productId: number;
  variantId: number | null;
  sku: string | null;
  name: string;
  image: string;
  price: number;
  size: string | null;
  quantity: number;
};

export type LineShortfall = {
  productId: number;
  name: string;
  available: number;
};

/**
 * Shared checkout line resolution (§27): fetches authoritative products +
 * variants, enforces variant-required products, prices from the variant when
 * present, and returns priced lines plus any stock shortfalls.
 * Never trusts client prices.
 */
export async function resolveCheckoutLines(rawItems: RawLine[]): Promise<{
  lineItems: PricedLine[];
  insufficient: LineShortfall[];
}> {
  const ids = [...new Set(rawItems.map((i) => Number(i.productId)))].filter(
    (n) => Number.isInteger(n) && n > 0
  );
  const dbProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(dbProducts.map((p) => [p.id, p]));
  const variantsByProduct = await getVariantsForProducts(ids);

  const lineItems: PricedLine[] = [];
  const problems: LineShortfall[] = [];

  for (const i of rawItems) {
    const pid = Number(i.productId);
    const p = byId.get(pid);
    if (!p) continue;
    const quantity = Math.min(10, Math.max(1, Number(i.quantity) || 1));
    const variants = variantsByProduct.get(pid) ?? [];

    if (variants.length > 0) {
      // Variant product: a valid, active variant is mandatory.
      const v = variants.find((x) => x.id === Number(i.variantId));
      if (!v) {
        problems.push({ productId: pid, name: p.name, available: 0 });
        continue;
      }
      if (quantity > v.stock) {
        problems.push({ productId: pid, name: `${p.name} (${v.color} / ${v.size})`, available: v.stock });
        continue;
      }
      lineItems.push({
        productId: pid,
        variantId: v.id,
        sku: v.sku,
        name: p.name,
        image: v.image || p.images[0] || "",
        price: v.price,
        size: [v.color, v.size].filter(Boolean).join(" / ") || null,
        quantity,
      });
    } else {
      if (quantity > p.stock) {
        problems.push({ productId: pid, name: p.name, available: p.stock });
        continue;
      }
      lineItems.push({
        productId: pid,
        variantId: null,
        sku: null,
        name: p.name,
        image: p.images[0] ?? "",
        price: p.price,
        size: typeof i.size === "string" ? i.size.slice(0, 40) : null,
        quantity,
      });
    }
  }

  // Defensive re-check (prices snapshotted above; quantities re-verified).
  const insufficient = findInsufficientStock(
    lineItems
      .filter((li) => li.variantId === null)
      .map((li) => ({ ...li, quantity: li.quantity })),
    new Map(dbProducts.map((p) => [p.id, p.stock]))
  );

  return { lineItems, insufficient: [...problems, ...insufficient] };
}

export type ReserveResult =
  | { ok: true }
  | { ok: false; failed: LineShortfall };

/** Reserve product + variant stock with compensation on a lost race. */
export async function reserveLines(lines: PricedLine[]): Promise<ReserveResult> {
  const doneVariant: PricedLine[] = [];
  for (const li of lines) {
    if (li.variantId !== null) {
      if (!(await reserveVariantStock(li.variantId, li.quantity))) {
        await releaseLines(doneVariant);
        return {
          ok: false,
          failed: { productId: li.productId, name: li.name, available: 0 },
        };
      }
      doneVariant.push(li);
    }
  }
  const simple = lines.filter((li) => li.variantId === null);
  if (simple.length > 0) {
    const result = await reserveStock(
      simple.map((li) => ({
        productId: li.productId,
        name: li.name,
        quantity: li.quantity,
      }))
    );
    if (!result.ok) {
      await releaseLines(doneVariant);
      return { ok: false, failed: result.failed };
    }
  }
  return { ok: true };
}

/** Release a previous reservation (both product and variant rows). */
export async function releaseLines(
  lines: Array<Pick<PricedLine, "productId" | "variantId" | "quantity">>
): Promise<void> {
  for (const li of lines) {
    if (li.variantId !== null && li.variantId !== undefined) {
      await releaseVariantStock(li.variantId, li.quantity);
    }
  }
  const simple = lines.filter((li) => li.variantId === null || li.variantId === undefined);
  if (simple.length > 0) {
    await releaseStock(
      simple.map((li) => ({ productId: li.productId, name: "", quantity: li.quantity }))
    );
  }
}
