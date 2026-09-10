import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/db/schema";
import { formatBDT } from "@/lib/format";
import type { CardVariantInfo } from "@/lib/variants";
import { lp, type Locale } from "@/lib/locale";
import Stars from "./Stars";
import QuickAddButton from "./QuickAddButton";
import WishlistButton from "./WishlistButton";

export default function ProductCard({
  product,
  wishlisted = false,
  variantInfo,
  lang,
}: {
  product: Product;
  wishlisted?: boolean;
  variantInfo?: CardVariantInfo;
  lang: Locale;
}) {
  const hasVariants = (variantInfo?.floor ?? null) !== null;
  const displayPrice = variantInfo?.floor ?? product.price;
  const defaultVariant = variantInfo?.defaultVariant ?? null;
  const soldOut = hasVariants ? !defaultVariant : product.stock <= 0;
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : null;

  return (
    <div className="group relative">
      <Link
        href={lp(lang, `/product/${product.slug}`)}
        className="block overflow-hidden rounded-xl bg-sand"
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="img-zoom object-cover"
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {soldOut && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Sold out
              </span>
            )}
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

      {!soldOut && (
        <div className="absolute right-3 top-3 flex translate-y-1 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <QuickAddButton
            product={product}
            variantId={defaultVariant?.id ?? null}
            price={displayPrice}
            sizeLabel={
              defaultVariant
                ? [defaultVariant.color, defaultVariant.size].filter(Boolean).join(" / ") || null
                : undefined
            }
          />
          <WishlistButton
            productId={product.id}
            name={product.name}
            initialSaved={wishlisted}
            lang={lang}
          />
        </div>
      )}
      {soldOut && (
        <div className="absolute right-3 top-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <WishlistButton
            productId={product.id}
            name={product.name}
            initialSaved={wishlisted}
            lang={lang}
          />
        </div>
      )}

      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <Stars rating={Number(product.rating)} size={12} />
          {product.reviewCount > 0 && (
            <span className="text-[11px] text-ink-soft">({product.reviewCount})</span>
          )}
        </div>
        <Link href={lp(lang, `/product/${product.slug}`)}>
          <h3 className="mt-1 text-sm font-semibold leading-snug transition-colors group-hover:text-clay">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-baseline gap-2">
          {hasVariants && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              From
            </span>
          )}
          <span className="text-sm font-bold">{formatBDT(displayPrice)}</span>
          {!hasVariants && product.compareAtPrice && (
            <span className="text-xs text-ink-soft/70 line-through">
              {formatBDT(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
