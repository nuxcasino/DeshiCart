"use client";

import { useState } from "react";
import type { Product } from "@/db/schema";
import { useCart } from "@/lib/cart-context";
import { formatBDT } from "@/lib/format";

export default function PurchasePanel({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(product.colors[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0],
        size,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const lowStock = product.stock <= 10;

  return (
    <div className="space-y-6">
      {product.colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Colour · <span className="text-ink">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  color === c
                    ? "bg-ink text-cream"
                    : "border border-sand bg-white text-ink-soft hover:border-clay"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.sizes.length > 0 && product.sizes[0] !== "One Size" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Size · <span className="text-ink">{size}</span>
            </p>
            <span className="text-xs text-ink-soft underline underline-offset-2 cursor-pointer">
              Size guide
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-[52px] rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                  size === s
                    ? "border-ink bg-ink text-cream"
                    : "border-sand bg-white text-ink hover:border-clay"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-sand bg-white">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-3 text-ink-soft transition-colors hover:text-clay"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            className="px-4 py-3 text-ink-soft transition-colors hover:text-clay"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          className={`flex-1 rounded-full py-3.5 text-sm font-bold text-cream transition-all ${
            added
              ? "bg-leaf"
              : "bg-ink hover:bg-clay hover:shadow-[0_8px_24px_rgba(179,84,30,0.35)]"
          }`}
        >
          {added
            ? "✓ Added to Bag"
            : `Add to Bag · ${formatBDT(product.price * quantity)}`}
        </button>
      </div>

      <p className={`text-xs font-semibold ${lowStock ? "text-clay" : "text-leaf"}`}>
        {lowStock
          ? `🔥 Only ${product.stock} left in stock — order soon`
          : "✓ In stock and ready to ship"}
      </p>

      <div className="grid grid-cols-3 gap-3 border-t border-sand pt-5 text-center">
        {[
          ["🚚", "2–4 day delivery"],
          ["💵", "Cash on delivery"],
          ["↺", "7-day exchange"],
        ].map(([icon, label]) => (
          <div key={label} className="rounded-lg bg-sand/60 px-2 py-3">
            <p className="text-lg">{icon}</p>
            <p className="mt-1 text-[11px] font-semibold text-ink-soft">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
