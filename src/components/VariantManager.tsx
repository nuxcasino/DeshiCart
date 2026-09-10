"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductVariant } from "@/db/schema";
import { adminVariantsClient } from "@/lib/hono";
import { suggestSku } from "@/lib/variants";

type RowEdits = Record<number, { price: string; stock: string }>;

export default function VariantManager({
  productId,
  initial,
}: {
  productId: number;
  initial: ProductVariant[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProductVariant[]>(initial);
  const [form, setForm] = useState({
    color: "",
    size: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    stock: "10",
    image: "",
    barcode: "",
    weightGrams: "",
  });
  const [edits, setEdits] = useState<RowEdits>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const input =
    "w-full rounded-lg border border-sand px-3 py-2 text-sm outline-none transition-colors focus:border-clay";

  const readError = (body: unknown, fallback: string) =>
    typeof (body as { error?: unknown })?.error === "string"
      ? String((body as { error: string }).error)
      : fallback;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminVariantsClient.index.$post({
        json: {
          productId,
          color: form.color,
          size: form.size,
          sku: form.sku || suggestSku(productId, form.color, form.size),
          price: Number(form.price),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
          stock: Number(form.stock),
          image: form.image,
          barcode: form.barcode,
          weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
          isActive: true,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !("variant" in (body as object))) {
        setError(readError(body, "Could not create variant."));
        return;
      }
      const created = (body as { variant: ProductVariant }).variant;
      setItems((prev) => [...prev, created]);
      setForm({
        color: "",
        size: "",
        sku: "",
        price: "",
        compareAtPrice: "",
        stock: "10",
        image: "",
        barcode: "",
        weightGrams: "",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const saveRow = async (v: ProductVariant) => {
    const e = edits[v.id];
    if (!e) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminVariantsClient[":id"].$patch({
        param: { id: String(v.id) },
        json: { price: Number(e.price), stock: Number(e.stock) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(readError(body, "Save failed."));
        return;
      }
      const updated = (body as { variant: ProductVariant }).variant;
      setItems((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (v: ProductVariant) => {
    setBusy(true);
    try {
      const res = await adminVariantsClient[":id"].$patch({
        param: { id: String(v.id) },
        json: { isActive: !v.isActive },
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) => (x.id === v.id ? { ...x, isActive: !x.isActive } : x))
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (v: ProductVariant) => {
    if (!confirm(`Delete variant ${v.sku}? Blocked if it has order history.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminVariantsClient[":id"].$delete({
        param: { id: String(v.id) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(readError(body, "Delete failed."));
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== v.id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const setEdit = (id: number, key: "price" | "stock", value: string) =>
    setEdits((prev) => ({
      ...prev,
      [id]: {
        price: prev[id]?.price ?? "",
        stock: prev[id]?.stock ?? "",
        [key]: value,
      },
    }));

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm font-semibold text-clay">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand p-6 text-sm text-ink-soft">
          No variants yet — this product sells as a simple product (one price, one
          stock). Add variants below to switch to variant pricing.
        </p>
      ) : (
        <ul className="divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
          {items.map((v) => {
            const e = edits[v.id];
            return (
              <li key={v.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="font-mono text-xs font-bold">{v.sku}</span>
                  <span className="font-semibold">
                    {v.color || "—"} / {v.size || "—"}
                  </span>
                  {!v.isActive && (
                    <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                      Off
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-ink-soft">
                      ৳
                      <input
                        type="number"
                        min={0}
                        value={e?.price ?? String(v.price)}
                        onChange={(ev) => setEdit(v.id, "price", ev.target.value)}
                        className="w-20 rounded-md border border-sand px-2 py-1 text-xs outline-none focus:border-clay"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-ink-soft">
                      Stock
                      <input
                        type="number"
                        min={0}
                        value={e?.stock ?? String(v.stock)}
                        onChange={(ev) => setEdit(v.id, "stock", ev.target.value)}
                        className="w-16 rounded-md border border-sand px-2 py-1 text-xs outline-none focus:border-clay"
                      />
                    </label>
                    {e && (
                      <button
                        onClick={() => saveRow(v)}
                        disabled={busy}
                        className="text-xs font-bold text-leaf hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(v)}
                      disabled={busy}
                      className="text-xs font-bold text-clay hover:underline disabled:opacity-50"
                    >
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => remove(v)}
                      disabled={busy}
                      className="text-xs font-bold text-ink-soft hover:text-clay hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="mt-6 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-3">
          New variant (color + size must be unique per product)
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Color</span>
          <input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Black" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Size</span>
          <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="XL" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">SKU *</span>
          <div className="flex gap-1.5">
            <input required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))} className={input} />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, sku: suggestSku(productId, f.color, f.size) }))}
              className="shrink-0 rounded-lg border border-sand px-2.5 text-xs font-bold text-ink-soft hover:border-clay hover:text-clay"
              title="Auto-generate SKU"
            >
              ⟳
            </button>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Price (BDT) *</span>
          <input required type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Compare-at (optional)</span>
          <input type="number" min={0} value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Stock *</span>
          <input required type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Image URL (optional)</span>
          <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Barcode (optional)</span>
          <input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Weight grams (optional)</span>
          <input type="number" min={0} value={form.weightGrams} onChange={(e) => setForm((f) => ({ ...f, weightGrams: e.target.value }))} className={input} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
        >
          {busy ? "Saving…" : "Add variant"}
        </button>
      </form>
    </div>
  );
}
