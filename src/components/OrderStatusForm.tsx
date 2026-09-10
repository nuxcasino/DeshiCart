"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Order } from "@/db/schema";
import { adminOrdersClient, paymentsClient } from "@/lib/hono";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"];

export default function OrderStatusForm({ order }: { order: Order }) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  >(order.status as "confirmed");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed" | "cancelled" | "refunded"
  >(order.paymentStatus as "pending");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminOrdersClient[":id"].$patch({
        param: { id: String(order.id) },
        json: { status, paymentStatus },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(body?.error ?? "Save failed.");
        return;
      }
      setMessage("Saved ✓");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const reconcile = async () => {
    if (!order.transactionId) {
      setMessage("No gateway transaction to reconcile (not an online order).");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await paymentsClient.reconcile.$post({
        json: { tranId: order.transactionId },
      });
      // Success + Zod-error shapes union; only outcome matters here.
      const body = (await res.json().catch(() => ({}))) as {
        outcome?: string;
      };
      setMessage(`Gateway says: ${body?.outcome ?? "unknown"}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-xl border border-sand bg-white p-5">
      <h2 className="font-display text-lg font-semibold">Fulfilment & payment</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Order status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm outline-none focus:border-clay"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Payment status
          </span>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
            className="w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm outline-none focus:border-clay"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-ink-soft">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {order.paymentMethod === "sslcommerz" && (
          <button
            type="button"
            onClick={reconcile}
            disabled={saving}
            className="rounded-full border border-sand bg-white px-6 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
          >
            Re-check with gateway
          </button>
        )}
      </div>
    </form>
  );
}
