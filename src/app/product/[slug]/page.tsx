import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCategoryById,
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
} from "@/lib/data";
import { getWishlistIds } from "@/lib/wishlist";
import { getCardVariantInfo, getProductVariants } from "@/lib/variants";
import { formatBDT } from "@/lib/format";
import Gallery from "@/components/Gallery";
import PurchasePanel from "@/components/PurchasePanel";
import ProductCard from "@/components/ProductCard";
import ReviewForm from "@/components/ReviewForm";
import Stars from "@/components/Stars";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [category, reviews, related, wishlistIds, variants] = await Promise.all([
    getCategoryById(product.categoryId),
    getProductReviews(product.id),
    getRelatedProducts(product),
    getWishlistIds(),
    getProductVariants(product.id),
  ]);
  const relatedVariantInfo = await getCardVariantInfo(related.map((p) => p.id));

  const activeVariants = variants.filter((v) => v.isActive);
  const floor =
    activeVariants.length > 0
      ? Math.min(...activeVariants.map((v) => v.price))
      : null;

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : null;

  const ratingNum = Number(product.rating);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-ink-soft animate-fade-in">
        <Link href="/" className="hover:text-clay transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-clay transition-colors">Shop</Link>
        {category && (
          <>
            <span>/</span>
            <Link
              href={`/shop?category=${category.slug}`}
              className="hover:text-clay transition-colors"
            >
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-ink font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="animate-fade-up">
          <Gallery images={product.images} name={product.name} badge={product.badge} />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {category && (
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
              {category.name}
            </p>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <a href="#reviews" className="mt-3 flex items-center gap-2">
            <Stars rating={ratingNum} size={16} />
            <span className="text-sm text-ink-soft">
              {ratingNum > 0 ? ratingNum.toFixed(1) : "New"} ·{" "}
              {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
            </span>
          </a>

          <div className="mt-5 flex items-baseline gap-3">
            {floor !== null && (
              <span className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
                From
              </span>
            )}
            <span className="font-display text-3xl font-semibold">
              {formatBDT(floor ?? product.price)}
            </span>
            {product.compareAtPrice && (
              <>
                <span className="text-lg text-ink-soft/60 line-through">
                  {formatBDT(product.compareAtPrice)}
                </span>
                {discount && (
                  <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-bold text-clay">
                    Save {discount}%
                  </span>
                )}
              </>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <div className="mt-7">
            <PurchasePanel product={product} variants={variants} />
          </div>

          {product.details.length > 0 && (
            <div className="mt-7 rounded-xl border border-sand bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Details & Care
              </p>
              <ul className="mt-3 space-y-2">
                {product.details.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-clay" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-20 scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Customer Reviews
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-display text-5xl font-semibold">
                {ratingNum > 0 ? ratingNum.toFixed(1) : "—"}
              </span>
              <div>
                <Stars rating={ratingNum} size={16} />
                <p className="mt-1 text-xs text-ink-soft">
                  Based on {product.reviewCount} review
                  {product.reviewCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-1.5">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold">{star}</span>
                  <span className="text-gold">★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{
                        width: reviews.length
                          ? `${(count / reviews.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="w-5 text-right text-ink-soft">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <ReviewForm productId={product.id} />
            </div>
          </div>

          <div className="lg:col-span-2">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sand p-10 text-center">
                <p className="font-display text-lg">No reviews yet</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Be the first to share your thoughts on this piece.
                </p>
              </div>
            ) : (
              <ul className="space-y-6">
                {reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-xl border border-sand bg-white p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand font-display text-sm font-semibold text-clay">
                          {review.author
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <p className="text-sm font-bold">
                            {review.author}
                            {review.verified && (
                              <span className="ml-2 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf">
                                Verified
                              </span>
                            )}
                          </p>
                          <Stars rating={review.rating} size={12} className="mt-0.5" />
                        </div>
                      </div>
                      <span className="text-xs text-ink-soft">
                        {new Date(review.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {review.title && (
                      <p className="mt-4 text-sm font-bold">{review.title}</p>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {review.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wishlisted={wishlistIds.has(p.id)}
                variantInfo={relatedVariantInfo.get(p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
