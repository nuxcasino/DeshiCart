"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address } from "@/db/schema";

export default function AddressManager({
  initial,
}: {
  initial: Address[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Address[]>(initial);
  const [form, setForm] = useState({
    label: "Home",
    name: "",
    phone: "",
    address: "",
    city: "Dhaka",
    postcode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const refresh = () => router.refresh();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "Could not save address.");
        return;
      }
      setItems((prev) =>
        prev.map((a) => ({ ...a, isDefault: false })).concat(body.address)
      );
      setForm({ label: "Home", name: "", phone: "", address: "", city: "Dhaka", postcode: "" });
      refresh();
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => {
        const next = prev.filter((a) => a.id !== id);
        const removed = prev.find((a) => a.id === id);
        if (removed?.isDefault && next.length > 0 && !next.some((a) => a.isDefault)) {
          next[0] = { ...next[0], isDefault: true };
        }
        return next;
      });
      refresh();
    }
  };

  const makeDefault = async (id: number) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      refresh();
    }
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-sand bg-white p-4"
            >
              <div className="text-sm">
                <p className="font-bold">
                  {a.label}
                  {a.isDefault && (
                    <span className="ml-2 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-ink-soft">
                  {a.name} · {a.phone}
                  <br />
                  {a.address}, {a.city}
                  {a.postcode ? ` ${a.postcode}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!a.isDefault && (
                  <button
                    onClick={() => makeDefault(a.id)}
                    className="text-xs font-bold text-clay hover:underline"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => remove(a.id)}
                  className="text-xs font-bold text-ink-soft hover:text-clay hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-5 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-2">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-2">
          Add new address
        </p>
        {(
          [
            ["label", "Label (Home / Office)", "Home"],
            ["name", "Full name", "Ayesha Rahman"],
            ["phone", "Phone", "01XXXXXXXXX"],
            ["city", "City", "Dhaka"],
            ["postcode", "Postcode", "1200"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              required={key !== "label" && key !== "postcode"}
              className="w-full rounded-lg border border-sand px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
          </label>
        ))}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Street address</span>
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="House 12, Road 5, Dhanmondi"
            required
            className="w-full rounded-lg border border-sand px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
          />
        </label>
        {error && <p className="text-sm font-semibold text-clay sm:col-span-2">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
        >
          {sending ? "Saving…" : "Save address"}
        </button>
      </form>
    </div>
  );
}
