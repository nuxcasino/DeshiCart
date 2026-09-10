"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductVariant } from "@/db/schema";
import { adminVariantsClient } from "@/lib/hono";
import { formatBDT } from "@/lib/format";

export type InventoryRow = ProductVariant & { productName: string };

export default function InventoryManager({ initial }: { initial: InventoryRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryRow[]>(initial);
  const [stocks, setStocks] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const save = async (row: InventoryRow) => {
    const raw = stocks[row.id];
    if (raw === undefined || raw === "") return;
    setBusyId(row.id);
    try {
      const res = await adminVariantsClient[":id"].$patch({
        param: { id: String(row.id) },
        json: { stock: Math.max(0, Math.floor(Number(raw))) },
      });
      const body = (await res.json().catch(() => ({}))) as {
        variant?: ProductVariant;
      };
      if (res.ok && body.variant) {
        setItems((prev) =>
          prev.map((x) => (x.id === row.id ? { ...x, stock: body.variant!.stock } : x))
        );
        setStocks((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const shown = items.filter(
    (r) =>
      filter === "" ||
      r.productName.toLowerCase().includes(filter.toLowerCase()) ||
      r.sku.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by product or SKU…"
        className="mb-4 w-full max-w-sm rounded-full border border-sand bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-clay"
      />
      <ul className="divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {r.productName}{" "}
                <span className="font-normal text-ink-soft">
                  · {r.color || "—"} / {r.size || "—"}
                </span>
              </p>
              <p className="font-mono text-xs text-ink-soft">
                {r.sku} · {formatBDT(r.price)}
                {!r.isActive ? " · OFF" : ""}
              </p>
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-wide ${
                r.stock <= 0 ? "text-clay" : r.stock <= 10 ? "text-gold" : "text-leaf"
              }`}
            >
              {r.stock <= 0 ? "Out" : `${r.stock} in stock`}
            </span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={stocks[r.id] ?? String(r.stock)}
                onChange={(e) =>
                  setStocks((prev) => ({ ...prev, [r.id]: e.target.value }))
                }
                className="w-20 rounded-md border border-sand px-2 py-1.5 text-xs outline-none focus:border-clay"
                aria-label={`Stock for ${r.sku}`}
              />
              <button
                onClick={() => save(r)}
                disabled={busyId === r.id || stocks[r.id] === undefined}
                className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-clay disabled:opacity-40"
              >
                {busyId === r.id ? "…" : "Set"}
              </button>
            </span>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-5 py-6 text-sm text-ink-soft">
            No variants yet. Add variants on a product page to manage stock here.
          </li>
        )}
      </ul>
    </div>
  );
}
