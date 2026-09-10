import Link from "next/link";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import { formatBDT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)::int` })
    .from(orders)
    .where(ne(orders.status, "cancelled"));
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "pending"));
  const [riskyCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.paymentStatus, "paid"), eq(orders.riskLevel, 1)));
  const lowStock = await db
    .select()
    .from(products)
    .where(lte(products.stock, 10))
    .orderBy(products.stock)
    .limit(10);
  const recent = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.id))
    .limit(5);

  const cards: Array<[string, string, string]> = [
    ["Revenue (excl. cancelled)", formatBDT(revenue?.total ?? 0), "/admin/orders"],
    ["Total orders", String(orderCount?.count ?? 0), "/admin/orders"],
    ["Pending payment", String(pendingCount?.count ?? 0), "/admin/orders"],
    ["Risky paid", String(riskyCount?.count ?? 0), "/admin/orders"],
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-sand bg-white p-5 transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-sand bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Low stock (≤ 10)</h2>
            <Link href="/admin/products" className="text-xs font-bold text-clay hover:underline">
              Manage →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">All stocked up. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-clay">
                    {p.name}
                  </Link>
                  <span className={`font-bold ${p.stock <= 0 ? "text-clay" : "text-ink-soft"}`}>
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-sand bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-clay hover:underline">
              All orders →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-clay">
                    #DC-{String(o.id).padStart(5, "0")} · {o.customerName}
                  </Link>
                  <span className="text-ink-soft">
                    {o.status} · {formatBDT(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
