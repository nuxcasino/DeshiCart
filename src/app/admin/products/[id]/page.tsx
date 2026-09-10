import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProductForm from "@/components/ProductForm";

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
    </div>
  );
}
