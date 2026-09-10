import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBDT } from "@/lib/format";
import OrderStatusForm from "@/components/OrderStatusForm";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) notFound();
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-bold text-clay hover:underline">
        ← All orders
      </Link>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        Order #DC-{String(order.id).padStart(5, "0")}
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-sand bg-white p-5 text-sm">
            <h3 className="font-display text-lg font-semibold">Customer</h3>
            <p className="mt-2 font-bold">{order.customerName}</p>
            <p className="text-ink-soft">{order.email} · {order.phone}</p>
            <p className="mt-1 text-ink-soft">
              {order.address}, {order.city}
            </p>
            {order.notes && <p className="mt-1 text-ink-soft">Note: {order.notes}</p>}
          </section>

          <section className="rounded-xl border border-sand bg-white p-5 text-sm">
            <h3 className="font-display text-lg font-semibold">Payment</h3>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between"><dt className="text-ink-soft">Method</dt><dd className="font-semibold">{order.paymentMethod}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Status</dt><dd className="font-semibold">{order.paymentStatus}</dd></div>
              {order.transactionId && (
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Transaction</dt><dd className="font-mono text-xs">{order.transactionId}</dd></div>
              )}
              {order.bankTranId && (
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Bank ref</dt><dd className="font-mono text-xs">{order.bankTranId}</dd></div>
              )}
              {order.cardInfo && (
                <div className="flex justify-between"><dt className="text-ink-soft">Channel</dt><dd className="font-semibold">{order.cardInfo}</dd></div>
              )}
              {order.storeAmount && (
                <div className="flex justify-between"><dt className="text-ink-soft">Settled</dt><dd className="font-semibold">৳{order.storeAmount}</dd></div>
              )}
              {order.riskLevel === 1 && (
                <div className="flex justify-between"><dt className="text-ink-soft">Risk</dt><dd className="font-bold text-clay">Flagged — verify before shipping</dd></div>
              )}
              <div className="flex justify-between border-t border-sand pt-2"><dt className="text-ink-soft">Subtotal</dt><dd className="font-semibold">{formatBDT(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd className="font-semibold">{order.shipping === 0 ? "Free" : formatBDT(order.shipping)}</dd></div>
              <div className="flex justify-between text-base"><dt className="font-bold">Total</dt><dd className="font-display font-semibold">{formatBDT(order.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-sand bg-white p-5 text-sm">
            <h3 className="font-display text-lg font-semibold">Items ({items.length})</h3>
            <ul className="mt-2 divide-y divide-sand">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-semibold">{item.name}</span>{" "}
                    <span className="text-ink-soft">
                      {item.size && item.size !== "One Size" ? `(${item.size}) ` : ""}× {item.quantity}
                    </span>
                  </span>
                  <span className="font-bold">{formatBDT(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <OrderStatusForm order={order} />
        </div>
      </div>
    </div>
  );
}
