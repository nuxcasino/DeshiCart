import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatBDT } from "@/lib/format";
import Stars from "./Stars";
import QuickAddButton from "./QuickAddButton";

export default function ProductCard({ product }: { product: Product }) {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : null;

  return (
    <div className="group relative">
      <Link
        href={`/product/${product.slug}`}
        className="block overflow-hidden rounded-xl bg-sand"
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="img-zoom h-full w-full object-cover"
          />
          {product.images[1] && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.images[1]}
              alt=""
              loading="lazy"
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.badge && (
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${
                  product.badge === "New"
                    ? "bg-leaf"
                    : product.badge === "Limited"
                    ? "bg-ink"
                    : "bg-clay"
                }`}
              >
                {product.badge}
              </span>
            )}
            {discount && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-clay">
                −{discount}%
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <QuickAddButton product={product} />
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <Stars rating={Number(product.rating)} size={12} />
          {product.reviewCount > 0 && (
            <span className="text-[11px] text-ink-soft">({product.reviewCount})</span>
          )}
        </div>
        <Link href={`/product/${product.slug}`}>
          <h3 className="mt-1 text-sm font-semibold leading-snug transition-colors group-hover:text-clay">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold">{formatBDT(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-xs text-ink-soft/70 line-through">
              {formatBDT(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
