import Link from "next/link";
import Image from "next/image";
import { getCategories, getFeaturedProducts } from "@/lib/data";
import { getWishlistIds } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const HERO_IMG =
  "https://images.pexels.com/photos/6070168/pexels-photo-6070168.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600";

const marqueeItems = [
  "Free delivery over ৳3,000",
  "New drops every Friday",
  "Cash on delivery nationwide",
  "7-day easy exchange",
  "Made in Bangladesh",
  "bKash & Nagad accepted",
];

export default async function HomePage() {
  const [cats, featured, wishlistIds] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getWishlistIds(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMG}
            alt="DeshiCart fashion editorial"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-2xl stagger">
            <p className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-cream/90">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              New Season · Dhaka Drop 2026
            </p>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Wear the energy of{" "}
              <span className="italic text-gold">new Dhaka</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-cream/75 sm:text-lg">
              Trendy tees, sharp shirts and statement accessories — designed
              for the young and restless of Bangladesh. Premium fabric, deshi
              soul, prices that make sense.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="rounded-full bg-cream px-8 py-3.5 text-sm font-bold text-ink transition-all hover:bg-gold hover:shadow-[0_8px_30px_rgba(200,150,62,0.4)]"
              >
                Shop the Collection
              </Link>
              <Link
                href="/shop?sort=newest"
                className="rounded-full border border-cream/40 px-8 py-3.5 text-sm font-bold text-cream transition-all hover:border-gold hover:text-gold"
              >
                New Arrivals →
              </Link>
            </div>
            <div className="mt-12 flex gap-10 text-cream/80">
              {[
                ["18+", "Curated styles"],
                ["4.8★", "Average rating"],
                ["64", "Districts served"],
              ].map(([num, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl font-semibold text-cream">{num}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-cream/50">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-sand bg-cream py-3">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map(
            (item, i) => (
              <span
                key={i}
                className="flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft"
              >
                {item} <span className="text-clay">✦</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* Collections */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
              Featured Collections
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your lane
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden text-sm font-semibold text-ink-soft underline-offset-4 hover:text-clay hover:underline sm:block"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-xl bg-sand"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="img-zoom object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-xl font-semibold text-cream sm:text-2xl">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-cream/70">{cat.tagline}</p>
                <span className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-gold opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Shop now →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-sand/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
                Handpicked
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                This week&apos;s most wanted
              </h2>
            </div>
            <Link
              href="/shop?sort=rating"
              className="hidden text-sm font-semibold text-ink-soft underline-offset-4 hover:text-clay hover:underline sm:block"
            >
              See bestsellers →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} wishlisted={wishlistIds.has(p.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Editorial split */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 overflow-hidden rounded-2xl bg-ink lg:grid-cols-2">
          <div className="order-2 p-8 sm:p-12 lg:order-1 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
              The DeshiCart Promise
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-cream sm:text-4xl">
              Premium fabric.<br />
              Deshi pride.<br />
              <span className="italic text-gold">Zero compromise.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-cream/65">
              Every piece is cut and sewn in Bangladesh from export-grade
              fabric — the same quality that ships worldwide, now made for us.
              We test every batch for shrinkage, colour-fastness and stitch
              strength before it earns the DeshiCart tag.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Export-grade 200+ GSM fabrics",
                "Colour-fast, pre-shrunk, bio-washed",
                "Fair wages for every maker",
              ].map((li) => (
                <li key={li} className="flex items-center gap-3 text-sm text-cream/85">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-[10px] text-gold">
                    ✓
                  </span>
                  {li}
                </li>
              ))}
            </ul>
            <Link
              href="/shop"
              className="mt-9 inline-block rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-ink transition-all hover:bg-cream"
            >
              Explore Everything
            </Link>
          </div>
          <div className="relative order-1 h-72 lg:order-2 lg:h-full lg:min-h-[480px]">
            <Image
              src="https://images.pexels.com/photos/15870230/pexels-photo-15870230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=900"
              alt="DeshiCart style editorial"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
            Word on the street
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Loved from Dhanmondi to Chattogram
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3 stagger">
          {[
            {
              quote:
                "Ordered Thursday night, wearing it at Friday's adda. The quality genuinely surprised everyone.",
              name: "Rafiul H.",
              place: "Dhanmondi, Dhaka",
            },
            {
              quote:
                "Finally a deshi brand that gets the oversized fit right. My entire hall floor now shops here.",
              name: "Sadia A.",
              place: "Chattogram",
            },
            {
              quote:
                "The chronograph watch looks triple its price. Packaging was gift-level. COD made it easy.",
              name: "Arif M.",
              place: "Sylhet",
            },
          ].map((t) => (
            <figure
              key={t.name}
              className="rounded-xl border border-sand bg-white p-7 shadow-[0_2px_16px_rgba(27,22,17,0.04)]"
            >
              <div className="text-gold text-sm tracking-widest">★★★★★</div>
              <blockquote className="mt-4 text-sm leading-relaxed text-ink-soft">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 text-sm font-bold">
                {t.name}{" "}
                <span className="block text-xs font-medium text-ink-soft/70">
                  {t.place}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-sand bg-sand/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Get the Friday drop first
          </h2>
          <p className="mt-3 text-sm text-ink-soft">
            Early access, subscriber-only prices and zero spam. Promise.
          </p>
          <form className="mx-auto mt-7 flex max-w-md gap-2" action="/shop">
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="w-full rounded-full border border-sand bg-white px-5 py-3 text-sm outline-none transition-colors focus:border-clay"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay"
            >
              Join
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
