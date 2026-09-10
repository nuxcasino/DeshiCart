"use client";

import type { Product } from "@/db/schema";
import { useCart } from "@/lib/cart-context";

export default function QuickAddButton({
  product,
  variantId = null,
  price,
  sizeLabel,
}: {
  product: Product;
  variantId?: number | null;
  price?: number;
  sizeLabel?: string | null;
}) {
  const { addItem } = useCart();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        addItem({
          productId: product.id,
          variantId,
          slug: product.slug,
          name: product.name,
          price: price ?? product.price,
          image: product.images[0],
          size: sizeLabel ?? product.sizes[0] ?? null,
          sku: null,
        });
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-lg transition-all hover:bg-clay hover:text-white"
      aria-label={`Quick add ${product.name} to bag`}
      title="Quick add to bag"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  );
}
