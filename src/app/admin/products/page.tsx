import Link from "next/link";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { asc } from "drizzle-orm";
import { formatBDT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [rows, cats] = await Promise.all([
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(categories),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Products ({rows.length})
        </h2>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay"
        >
          + New product
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
        {rows.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/products/${p.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 transition-colors hover:bg-sand/40"
            >
              <div>
                <p className="text-sm font-bold">
                  {p.name}
                  {p.stock <= 0 && (
                    <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Sold out
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {catById.get(p.categoryId) ?? "—"} · /{p.slug} · stock {p.stock}
                </p>
              </div>
              <span className="text-sm font-bold">{formatBDT(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
