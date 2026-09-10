import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export type StockLine = {
  productId: number;
  name: string;
  quantity: number;
};

export type StockShortfall = {
  productId: number;
  name: string;
  available: number;
};

/** Friendly pre-check against a freshly-read stock snapshot. */
export function findInsufficientStock(
  lines: StockLine[],
  stockById: Map<number, number>
): StockShortfall[] {
  return lines
    .map((li) => ({
      productId: li.productId,
      name: li.name,
      available: stockById.get(li.productId) ?? 0,
      requested: li.quantity,
    }))
    .filter((x) => x.requested > x.available)
    .map(({ productId, name, available }) => ({
      productId,
      name,
      available,
    }));
}

/**
 * Atomically reserve stock, one conditional decrement per row
 * (`stock >= quantity`), so concurrent checkouts can't oversell.
 * On a lost race, already-reserved rows are restored.
 */
export async function reserveStock(
  lines: StockLine[]
): Promise<{ ok: true } | { ok: false; failed: StockShortfall }> {
  const reserved: StockLine[] = [];
  for (const li of lines) {
    const updated = await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${li.quantity}` })
      .where(
        and(eq(products.id, li.productId), gte(products.stock, li.quantity))
      )
      .returning();
    if (updated.length === 0) {
      await releaseStock(reserved);
      return {
        ok: false,
        failed: { productId: li.productId, name: li.name, available: 0 },
      };
    }
    reserved.push(li);
  }
  return { ok: true };
}

/** Release a previous reservation (order failure / payment failure). */
export async function releaseStock(lines: StockLine[]) {
  for (const li of lines) {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} + ${li.quantity}` })
      .where(eq(products.id, li.productId));
  }
}
