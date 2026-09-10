import Link from "next/link";
import { db } from "@/db";
import { categories } from "@/db/schema";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const cats = await db.select().from(categories);
  return (
    <div>
      <Link href="/admin/products" className="text-sm font-bold text-clay hover:underline">
        ← All products
      </Link>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        New product
      </h2>
      <div className="mt-4">
        <ProductForm categories={cats} />
      </div>
    </div>
  );
}
