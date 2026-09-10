import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBDT } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import ClearCartOnSuccess from "@/components/ClearCartOnSuccess";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) notFound();

  // Orders placed while logged in are visible only to their owner.
  // Guest orders (userId null) keep the legacy shareable link behavior.
  if (order.userId !== null) {
    const session = await getSessionUser();
    if (!session || session.id !== order.userId) notFound();
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const paymentLabel =
    order.paymentMethod === "bkash"
      ? "bKash"
      : order.paymentMethod === "card"
        ? "Card"
        : order.paymentMethod === "sslcommerz"
          ? "Online Payment"
          : "Cash on Delivery";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ClearCartOnSuccess orderId={order.id} />
      <div className="text-center animate-fade-up">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-leaf/10 text-4xl">
          🎉
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
          Order confirmed!
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Thanks, <span className="font-semibold text-ink">{order.customerName}</span>.
          Your order <span className="font-bold text-clay">#DC-{String(order.id).padStart(5, "0")}</span>{" "}
          is being packed and will reach {order.city} in 2–4 days.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          A confirmation was sent to {order.email}
        </p>
        {order.paymentStatus === "paid" && order.riskLevel === 1 && (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-xs leading-relaxed text-ink-soft">
            ⚠️ Your online payment was flagged for a routine review by the
            payment provider. Your order is reserved — we&apos;ll confirm it
            shortly and contact you if anything is needed.
          </p>
        )}
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-sand bg-white animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <div className="border-b border-sand bg-sand/40 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-bold">Order #DC-{String(order.id).padStart(5, "0")}</span>
            <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-leaf">
              {order.status}
            </span>
          </div>
        </div>
        <ul className="divide-y divide-sand px-6">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{item.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {item.size && item.size !== "One Size" ? `Size ${item.size} · ` : ""}
                  Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-bold">
                {formatBDT(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-sand px-6 py-5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-semibold">{formatBDT(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-soft">
                Discount{order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <span className="font-semibold text-leaf">−{formatBDT(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-soft">Delivery</span>
            <span className="font-semibold">
              {order.shipping === 0 ? "Free" : formatBDT(order.shipping)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Payment</span>
            <span className="font-semibold">
              {paymentLabel}
              {order.paymentStatus === "paid" && (
                <span className="ml-2 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf">
                  Paid
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between border-t border-sand pt-3 text-base">
            <span className="font-bold">Total</span>
            <span className="font-display text-xl font-semibold">
              {formatBDT(order.total)}
            </span>
          </div>
        </div>
        <div className="border-t border-sand bg-sand/30 px-6 py-4 text-xs text-ink-soft">
          <p className="font-bold uppercase tracking-wider text-ink-soft/80">
            Delivering to
          </p>
          <p className="mt-1">
            {order.address}, {order.city} · {order.phone}
          </p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/shop"
          className="inline-block rounded-full bg-ink px-8 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-clay"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
