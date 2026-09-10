"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Coupon } from "@/db/schema";

export default function CouponManager({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Coupon[]>(initial);
  const [form, setForm] = useState({
    code: "",
    type: "flat",
    value: "",
    minSubtotal: "",
    maxUses: "",
    expiresAt: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, maxUses: form.maxUses || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Could not create coupon.");
        return;
      }
      setItems((prev) => [body.coupon, ...prev]);
      setForm({ code: "", type: "flat", value: "", minSubtotal: "", maxUses: "", expiresAt: "" });
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const toggle = async (c: Coupon) => {
    const res = await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
      router.refresh();
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== c.id));
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
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
            <div>
              <p className="text-sm font-bold">
                {c.code}
                {!c.active && (
                  <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                    Off
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {c.type === "percent" ? `${c.value}%` : `৳${c.value}`} off
                {c.minSubtotal > 0 ? ` · min ৳${c.minSubtotal}` : ""}
                {c.maxUses !== null ? ` · ${c.usedCount}/${c.maxUses} used` : ` · ${c.usedCount} used`}
                {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString("en-GB")}` : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => toggle(c)} className="text-xs font-bold text-clay hover:underline">
                {c.active ? "Disable" : "Enable"}
              </button>
              <button onClick={() => remove(c)} className="text-xs font-bold text-ink-soft hover:text-clay hover:underline">
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-5 py-6 text-sm text-ink-soft">No coupons yet.</li>
        )}
      </ul>

      <form onSubmit={add} className="mt-6 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-3">
          New coupon
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Code *</span>
          <input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EID20" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Type</span>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={`${input} bg-white`}>
            <option value="flat">Flat (BDT)</option>
            <option value="percent">Percent (%)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Value *</span>
          <input required type="number" min={1} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Min subtotal (BDT)</span>
          <input type="number" min={0} value={form.minSubtotal} onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Max uses (blank = unlimited)</span>
          <input type="number" min={1} value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Expires (optional)</span>
          <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={input} />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
        >
          {sending ? "Creating…" : "Create coupon"}
        </button>
      </form>
    </div>
  );
}
