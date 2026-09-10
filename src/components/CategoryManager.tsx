"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/db/schema";

export default function CategoryManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Category[]>(initial);
  const [form, setForm] = useState({ name: "", slug: "", tagline: "", image: "" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Could not create category.");
        return;
      }
      setItems((prev) => [...prev, body.category]);
      setForm({ name: "", slug: "", tagline: "", image: "" });
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const remove = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? Only empty categories can be deleted.`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof body?.error === "string" ? body.error : "Delete failed.");
      return;
    }
    setItems((prev) => prev.filter((c) => c.id !== cat.id));
    router.refresh();
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
          <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div>
              <p className="text-sm font-bold">{c.name}</p>
              <p className="text-xs text-ink-soft">/{c.slug} · {c.tagline}</p>
            </div>
            <button
              onClick={() => remove(c)}
              className="text-xs font-bold text-ink-soft transition-colors hover:text-clay"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-6 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-2">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-2">
          New category
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Name *</span>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Slug (auto from name if empty)</span>
          <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Tagline</span>
          <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Image URL</span>
          <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={input} />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
        >
          {sending ? "Creating…" : "Create category"}
        </button>
      </form>
    </div>
  );
}
