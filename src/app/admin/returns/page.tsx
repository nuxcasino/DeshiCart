import Link from "next/link";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { formatBDT } from "@/lib/format";
import ReturnActions from "@/components/ReturnActions";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const requests = await db
    .select()
    .from(returnRequests)
    .orderBy(desc(returnRequests.id))
    .limit(100);
  const orderIds = [...new Set(requests.map((r) => r.orderId))];
  const orderRows =
    orderIds.length > 0
      ? await db.select().from(orders).where(inArray(orders.id, orderIds))
      : [];
  const orderById = new Map(orderRows.map((o) => [o.id, o]));

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Returns ({requests.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Online-paid orders refund through the gateway; COD refunds are settled in
        cash offline. Live refunds need your server IP whitelisted with SSLCommerz.
      </p>
      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No return requests.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => {
            const order = orderById.get(r.orderId);
            return (
              <li key={r.id} className="rounded-xl border border-sand bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-bold">
                      {order ? (
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-clay">
                          Order #DC-{String(order.id).padStart(5, "0")}
                        </Link>
                      ) : (
                        <>Order #{r.orderId}</>
                      )}{" "}
                      · {order ? formatBDT(order.total) : ""} · {order?.paymentMethod}
                    </p>
                    <p className="mt-1 text-ink-soft">
                      “{r.reason}” · requested{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    {r.status}
                  </span>
                </div>
                {order && (
                  <div className="mt-3 border-t border-sand pt-3">
                    <ReturnActions request={r} order={order} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
