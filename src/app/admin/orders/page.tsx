import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatBDT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.id)).limit(100);
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Orders ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No orders yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 transition-colors hover:bg-sand/40"
              >
                <div>
                  <p className="text-sm font-bold">
                    #DC-{String(o.id).padStart(5, "0")} · {o.customerName}
                    {o.riskLevel === 1 && o.paymentStatus === "paid" && (
                      <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-clay">
                        Risky
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {o.paymentMethod} · {o.city}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">{formatBDT(o.total)}</p>
                  <p className="text-xs text-ink-soft">
                    {o.status} · {o.paymentStatus}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
