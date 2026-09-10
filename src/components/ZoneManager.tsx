"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShippingZone } from "@/db/schema";

export default function ZoneManager({ initial }: { initial: ShippingZone[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ShippingZone[]>(initial);
  const [form, setForm] = useState({ city: "", fee: "", freeOver: "3000" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, freeOver: form.freeOver || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Could not save zone.");
        return;
      }
      setItems((prev) => {
        const next = prev.filter((z) => z.city !== body.zone.city);
        return [...next, body.zone].sort((a, b) => a.city.localeCompare(b.city));
      });
      setForm({ city: "", fee: "", freeOver: "3000" });
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const remove = async (z: ShippingZone) => {
    if (!confirm(`Delete the ${z.city} zone? Checkout falls back to the flat rate.`)) return;
    const res = await fetch(`/api/admin/zones/${z.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== z.id));
      router.refresh();
    }
  };

  const input =
    "w-full rounded-lg border border-sand px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay";

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm font-semibold text-clay">
          {error}
        </p>
      )}
      <ul className="divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
        {items.map((z) => (
          <li key={z.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <p className="text-sm font-bold">{z.city}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                ৳{z.fee} fee{z.freeOver !== null ? ` · free over ৳${z.freeOver}` : " · never free"}
                {!z.active ? " · disabled" : ""}
              </p>
            </div>
            <button onClick={() => remove(z)} className="text-xs font-bold text-ink-soft hover:text-clay hover:underline">
              Delete
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-5 py-6 text-sm text-ink-soft">No zones — flat rate applies everywhere.</li>
        )}
      </ul>

      <form onSubmit={save} className="mt-6 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-3">
          Add / update zone (same city overwrites)
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">City *</span>
          <input required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Dhaka" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Fee (BDT) *</span>
          <input required type="number" min={0} value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Free over (blank = never)</span>
          <input type="number" min={0} value={form.freeOver} onChange={(e) => setForm((f) => ({ ...f, freeOver: e.target.value }))} className={input} />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
        >
          {sending ? "Saving…" : "Save zone"}
        </button>
      </form>
    </div>
  );
}
