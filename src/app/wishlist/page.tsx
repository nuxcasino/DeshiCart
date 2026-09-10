import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, user.id))
    .orderBy(desc(wishlistItems.id));
  const ids = rows.map((r) => r.productId);
  const prods =
    ids.length > 0
      ? await db.select().from(products).where(inArray(products.id, ids))
      : [];
  const byId = new Map(prods.map((p) => [p.id, p]));
  const items = rows
    .map((r) => byId.get(r.productId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
        Saved for later
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Wishlist
      </h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-3xl">
            🤍
          </div>
          <p className="font-display text-xl">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Tap the heart on any product to keep it here.
          </p>
          <Link
            href="/shop"
            className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay"
          >
            Browse the Shop
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} wishlisted />
          ))}
        </div>
      )}
    </div>
  );
}
