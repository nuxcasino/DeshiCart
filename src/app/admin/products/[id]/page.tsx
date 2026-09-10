import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProductForm from "@/components/ProductForm";
import VariantManager from "@/components/VariantManager";
import ImageManager from "@/components/ImageManager";
import { getProductImageRows } from "@/lib/product-images";
import { getProductVariants } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) notFound();
  const cats = await db.select().from(categories);
  const variants = await getProductVariants(productId, false);
  const images = await getProductImageRows(productId);

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-bold text-clay hover:underline">
        ← All products
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Edit: {product.name}
        </h2>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="text-xs font-bold text-clay hover:underline"
        >
          View live ↗
        </Link>
      </div>
      <div className="mt-4">
        <ProductForm categories={cats} product={product} />
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
        Variants ({variants.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Variant price and stock override the product defaults once variants exist.
      </p>
      <div className="mt-4">
        <VariantManager productId={product.id} initial={variants} />
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
        Images ({images.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Managed on the ImageKit CDN. Uploading, reordering or deleting here
        updates the storefront automatically.
      </p>
      <div className="mt-4">
        <ImageManager productId={product.id} initial={images} />
      </div>
    </div>
  );
}
