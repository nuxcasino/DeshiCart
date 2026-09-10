import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import InventoryManager from "@/components/InventoryManager";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const rows = await db
    .select({
      variant: productVariants,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(asc(products.name), asc(productVariants.id));

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Inventory ({rows.length} variants)
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Variant-level stock. Products without variants keep selling from the
        product-level stock on their edit page.
      </p>
      <div className="mt-4">
        <InventoryManager
          initial={rows.map((r) => ({ ...r.variant, productName: r.productName }))}
        />
      </div>
    </div>
  );
}
