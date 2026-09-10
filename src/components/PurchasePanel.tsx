"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Product, ProductVariant } from "@/db/schema";
import { useCart } from "@/lib/cart-context";
import { formatBDT } from "@/lib/format";

export default function PurchasePanel({
  product,
  variants = [],
}: {
  product: Product;
  variants?: ProductVariant[];
}) {
  const { addItem } = useCart();
  const hasVariants = variants.length > 0;

  const colors = useMemo(
    () =>
      hasVariants
        ? [...new Set(variants.filter((v) => v.isActive).map((v) => v.color))]
        : product.colors,
    [hasVariants, variants, product.colors]
  );
  const sizesFor = (color: string) =>
    hasVariants
      ? variants
          .filter((v) => v.isActive && v.color === color)
          .map((v) => v.size)
      : product.sizes;

  const [color, setColor] = useState<string | null>(
    colors[0] ?? product.colors[0] ?? null
  );
  const initialSizes = sizesFor(colors[0] ?? "");
  const [size, setSize] = useState<string | null>(
    initialSizes[0] ?? product.sizes[0] ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected: ProductVariant | null = hasVariants
    ? (variants.find(
        (v) => v.isActive && v.color === color && v.size === size
      ) ?? null)
    : null;

  const price = selected?.price ?? product.price;
  const compareAtPrice = selected?.compareAtPrice ?? product.compareAtPrice;
  const stock = selected ? selected.stock : product.stock;
  const image = selected?.image || product.images[0];
  const soldOut = stock <= 0;
  const unavailable = hasVariants && !selected;
  const maxQuantity = Math.max(1, Math.min(10, stock));
  const lowStock = !soldOut && stock <= 10;

  const pickColor = (c: string) => {
    setColor(c);
    const sizes = sizesFor(c);
    if (!size || !sizes.includes(size)) {
      setSize(sizes[0] ?? null);
    }
  };

  const handleAdd = () => {
    if (soldOut || unavailable) return;
    addItem(
      {
        productId: product.id,
        variantId: selected?.id ?? null,
        slug: product.slug,
        name: product.name,
        price,
        image,
        size: hasVariants
          ? [selected?.color, selected?.size].filter(Boolean).join(" / ") || null
          : size,
        sku: selected?.sku ?? null,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const discount =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Colour · <span className="text-ink">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
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

      {sizesFor(color ?? "").length > 0 &&
        sizesFor(color ?? "")[0] !== "One Size" && (
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
              {sizesFor(color ?? "").map((s) => {
                const v = hasVariants
                  ? variants.find(
                      (x) => x.isActive && x.color === color && x.size === s
                    )
                  : null;
                const out = hasVariants && (!v || v.stock <= 0);
                return (
                  <button
                    key={s}
                    disabled={out}
                    onClick={() => setSize(s)}
                    className={`min-w-[52px] rounded-lg border py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                      size === s
                        ? "border-ink bg-ink text-cream"
                        : "border-sand bg-white text-ink hover:border-clay"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-sand bg-white">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={soldOut || unavailable}
            className="px-4 py-3 text-ink-soft transition-colors hover:text-clay disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={soldOut || unavailable}
            className="px-4 py-3 text-ink-soft transition-colors hover:text-clay disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={soldOut || unavailable}
          className={`flex-1 rounded-full py-3.5 text-sm font-bold text-cream transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            added
              ? "bg-leaf"
              : "bg-ink hover:bg-clay hover:shadow-[0_8px_24px_rgba(179,84,30,0.35)]"
          }`}
        >
          {soldOut
            ? "Out of Stock"
            : unavailable
              ? "Select an available combination"
              : added
                ? "✓ Added to Bag"
                : `Add to Bag · ${formatBDT(price * quantity)}`}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={`text-xs font-semibold ${soldOut || unavailable || lowStock ? "text-clay" : "text-leaf"}`}>
          {soldOut
            ? "Out of stock — check back soon"
            : unavailable
              ? "This combination isn't available"
              : lowStock
                ? `🔥 Only ${stock} left in stock — order soon`
                : "✓ In stock and ready to ship"}
        </p>
        {selected && (
          <p className="font-mono text-[11px] text-ink-soft">SKU {selected.sku}</p>
        )}        {selected?.image && (
          <span className="relative block h-14 w-11 overflow-hidden rounded-md bg-sand">
            <Image
              src={selected.image}
              alt={`${selected.color} ${selected.size}`}
              fill
              sizes="44px"
              className="object-cover"
            />
          </span>
        )}
        {discount && (
          <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-bold text-clay">
            Save {discount}%
          </span>
        )}
      </div>

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
