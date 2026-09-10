import { db } from "@/db";
import { productVariants, type Product, type ProductVariant } from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

// Variant domain service (§§9-14). Rules:
// - A product WITHOUT active variants behaves exactly as before (simple mode:
//   product.price / product.stock are authoritative).
// - A product WITH active variants sells through variants only: variant price
//   and variant stock are authoritative; product.price remains the display
//   fallback ("from" price floor).

export async function getProductVariants(
  productId: number,
  activeOnly = true
): Promise<ProductVariant[]> {
  const rows = await db
    .select()
    .from(productVariants)
    .where(
      activeOnly
        ? and(
            eq(productVariants.productId, productId),
            eq(productVariants.isActive, true)
          )
        : eq(productVariants.productId, productId)
    )
    .orderBy(productVariants.id);
  return rows;
}

export async function getVariantsForProducts(
  productIds: number[]
): Promise<Map<number, ProductVariant[]>> {
  const map = new Map<number, ProductVariant[]>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select()
    .from(productVariants)
    .where(
      and(
        inArray(productVariants.productId, productIds),
        eq(productVariants.isActive, true)
      )
    );
  for (const v of rows) {
    const list = map.get(v.productId) ?? [];
    list.push(v);
    map.set(v.productId, list);
  }
  return map;
}

/** Minimum active-variant price per product (for "From ৳X" card display). */
export async function getVariantPriceFloors(
  productIds: number[]
): Promise<Map<number, number>> {
  const floors = new Map<number, number>();
  const byProduct = await getVariantsForProducts(productIds);
  for (const [pid, variants] of byProduct) {
    if (variants.length > 0) {
      floors.set(pid, Math.min(...variants.map((v) => v.price)));
    }
  }
  return floors;
}

/** Display price: variant floor when variants exist, else the product price. */
export function displayPrice(product: Product, floor?: number): number {
  return floor ?? product.price;
}

/** First purchasable variant (highest stock) — used by quick-add. */
export function defaultVariant(
  variants: ProductVariant[]
): ProductVariant | null {
  const available = variants.filter((v) => v.stock > 0);
  if (available.length === 0) return null;
  return available.sort((a, b) => b.stock - a.stock)[0];
}

/** Atomic conditional decrement for variant stock (race-safe, no oversell). */
export async function reserveVariantStock(
  variantId: number,
  quantity: number
): Promise<boolean> {
  const updated = await db
    .update(productVariants)
    .set({ stock: sql`${productVariants.stock} - ${quantity}` })
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.isActive, true),
        gte(productVariants.stock, quantity)
      )
    )
    .returning();
  return updated.length > 0;
}

export async function releaseVariantStock(
  variantId: number,
  quantity: number
): Promise<void> {
  await db
    .update(productVariants)
    .set({ stock: sql`${productVariants.stock} + ${quantity}` })
    .where(eq(productVariants.id, variantId));
}

/** Suggested SKU for the admin form (editable before save). */
export function suggestSku(
  productId: number,
  color: string,
  size: string
): string {
  const clean = (s: string) =>
    s.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "STD";
  return `P${productId}-${clean(color)}-${clean(size)}`;
}
