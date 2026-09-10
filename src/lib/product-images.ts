import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";

/** Ordered rows: primary first, then position, then id. */
export async function getProductImageRows(productId: number) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.isPrimary), asc(productImages.position), asc(productImages.id));
}

/**
 * Keeps the legacy `products.images` display array in sync with the metadata
 * table, so the storefront needs no changes (§59 backward compatibility).
 */
export async function syncProductImages(productId: number): Promise<string[]> {
  const rows = await getProductImageRows(productId);
  const urls = rows.map((r) => r.url);
  await db
    .update(products)
    .set({ images: urls })
    .where(eq(products.id, productId));
  return urls;
}
