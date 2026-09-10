import type { Product, ProductVariant, Review } from "@/db/schema";

// Schema.org JSON-LD builders (§38). Every entity is built from genuine
// database content only — no fake reviews, ratings, or statistics.

function siteUrl(): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || "https://deshi-cart.vercel.app";
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "DeshiCart",
    url: siteUrl(),
    description:
      "Trend-forward clothing and accessories designed in Dhaka, delivered across Bangladesh.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@deshicart.com.bd",
      telephone: "+8801711000000",
      contactType: "customer service",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DeshiCart",
    url: siteUrl(),
    inLanguage: ["bn", "en"],
  };
}

export function breadcrumbJsonLd(
  trail: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export function itemListJsonLd(
  name: string,
  url: string,
  products: Array<Pick<Product, "name" | "slug">>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/bn/product/${p.slug}`,
      name: p.name,
    })),
  };
}

export function productJsonLd(args: {
  product: Product;
  variants: ProductVariant[];
  reviews: Review[];
  categoryName: string | null;
  url: string;
}) {
  const { product, variants, reviews, categoryName, url } = args;
  const active = variants.filter((v) => v.isActive);
  const prices = active.length > 0 ? active.map((v) => v.price) : [product.price];
  const inStock =
    active.length > 0
      ? active.some((v) => v.stock > 0)
      : product.stock > 0;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.slice(0, 500),
    image: product.images.slice(0, 5),
    sku: product.slug.toUpperCase(),
    category: categoryName ?? undefined,
    brand: { "@type": "Brand", name: "DeshiCart" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: Math.max(1, active.length || 1),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  // Genuine ratings only: aggregate appears iff real reviews exist.
  if (product.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(product.rating),
      reviewCount: product.reviewCount,
    };
  }
  if (reviews.length > 0) {
    data.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
      },
      name: r.title || undefined,
      reviewBody: r.body,
      datePublished: new Date(r.createdAt).toISOString().split("T")[0],
    }));
  }
  return data;
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
