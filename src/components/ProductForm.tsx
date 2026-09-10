"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Product } from "@/db/schema";

type Draft = {
  name: string;
  slug: string;
  description: string;
  details: string;
  price: string;
  compareAtPrice: string;
  categoryId: string;
  images: string;
  sizes: string;
  colors: string;
  badge: string;
  featured: boolean;
  stock: string;
};

function toDraft(p?: Product): Draft {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    description: p?.description ?? "",
    details: (p?.details ?? []).join("\n"),
    price: p ? String(p.price) : "",
    compareAtPrice: p?.compareAtPrice ? String(p.compareAtPrice) : "",
    categoryId: p ? String(p.categoryId) : "",
    images: (p?.images ?? []).join("\n"),
    sizes: (p?.sizes ?? []).join(", "),
    colors: (p?.colors ?? []).join(", "),
    badge: p?.badge ?? "",
    featured: p?.featured ?? false,
    stock: p ? String(p.stock) : "25",
  };
}

export default function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Draft>(toDraft(product));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set =
    (key: keyof Draft) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
      }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const res = await fetch(url, {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Save failed.");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!product || !confirm(`Delete "${product.name}"? Its reviews will be removed too.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body?.error === "string" ? body.error : "Delete failed.");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const input =
    "w-full rounded-lg border border-sand px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay";

  return (
    <form onSubmit={save} className="grid gap-4 rounded-xl border border-sand bg-white p-5 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Name *</span>
        <input required value={form.name} onChange={set("name")} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Slug *</span>
        <input required value={form.slug} onChange={set("slug")} placeholder="noir-essential-tee" className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Description *</span>
        <textarea required value={form.description} onChange={set("description")} rows={3} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Details (one per line)</span>
        <textarea value={form.details} onChange={set("details")} rows={4} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Images (one URL per line)</span>
        <textarea value={form.images} onChange={set("images")} rows={4} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Price (BDT) *</span>
        <input required type="number" min={0} value={form.price} onChange={set("price")} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Compare-at price (optional)</span>
        <input type="number" min={0} value={form.compareAtPrice} onChange={set("compareAtPrice")} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Category *</span>
        <select required value={form.categoryId} onChange={set("categoryId")} className={`${input} bg-white`}>
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Stock *</span>
        <input required type="number" min={0} value={form.stock} onChange={set("stock")} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Sizes (comma-separated)</span>
        <input value={form.sizes} onChange={set("sizes")} placeholder="S, M, L, XL" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Colors (comma-separated)</span>
        <input value={form.colors} onChange={set("colors")} placeholder="Jet Black, Charcoal" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Badge (optional)</span>
        <input value={form.badge} onChange={set("badge")} placeholder="Bestseller / New / Limited" className={input} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={form.featured} onChange={set("featured")} className="h-4 w-4 accent-[#b3541e]" />
        Featured on homepage
      </label>
      {error && <p className="text-sm font-semibold text-clay sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ink px-8 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
        >
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        {product && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="rounded-full border border-clay/40 bg-white px-8 py-3 text-sm font-bold text-clay transition-colors hover:bg-clay hover:text-white disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
