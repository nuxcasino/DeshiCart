import { db } from "@/db";
import { categories, products, reviews, shippingZones } from "@/db/schema";
import { sql } from "drizzle-orm";
import { seedCategories, seedProducts, seedReviews } from "./seed-data";

const defaultShippingZones = [
  { city: "Dhaka", fee: 60, freeOver: 3000 },
  { city: "Chattogram", fee: 100, freeOver: 3000 },
  { city: "Sylhet", fee: 100, freeOver: 3000 },
  { city: "Rajshahi", fee: 100, freeOver: 3000 },
  { city: "Khulna", fee: 100, freeOver: 3000 },
  { city: "Barishal", fee: 100, freeOver: 3000 },
  { city: "Rangpur", fee: 100, freeOver: 3000 },
  { city: "Mymensingh", fee: 100, freeOver: 3000 },
  { city: "Cumilla", fee: 100, freeOver: 3000 },
  { city: "Other", fee: 130, freeOver: 3000 },
];

let zonesSeeded = false;

export async function ensureShippingZones() {
  if (zonesSeeded) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shippingZones);
  if (count === 0) {
    await db.insert(shippingZones).values(defaultShippingZones).onConflictDoNothing();
  }
  zonesSeeded = true;
}

let seeded = false;

export async function ensureSeeded() {
  await ensureShippingZones();
  if (seeded) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);
  if (count > 0) {
    seeded = true;
    return;
  }

  const insertedCategories = await db
    .insert(categories)
    .values(seedCategories)
    .onConflictDoNothing()
    .returning();

  const allCategories =
    insertedCategories.length > 0
      ? insertedCategories
      : await db.select().from(categories);

  const catBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));

  const insertedProducts = await db
    .insert(products)
    .values(
      seedProducts.map((p, i) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        details: p.details,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        categoryId: catBySlug.get(p.category)!,
        images: p.images,
        sizes: p.sizes,
        colors: p.colors,
        badge: p.badge ?? null,
        featured: p.featured ?? false,
        stock: p.stock ?? 18 + ((i * 7) % 30),
        createdAt: new Date(Date.now() - i * 36 * 60 * 60 * 1000),
      }))
    )
    .onConflictDoNothing()
    .returning();

  const prodBySlug = new Map(insertedProducts.map((p) => [p.slug, p.id]));

  const reviewRows = seedReviews
    .filter((r) => prodBySlug.has(r.productSlug))
    .map((r) => ({
      productId: prodBySlug.get(r.productSlug)!,
      author: r.author,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified ?? false,
      createdAt: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
    }));

  if (reviewRows.length > 0) {
    await db.insert(reviews).values(reviewRows);
  }

  // Denormalise rating + review counts onto products
  await db.execute(sql`
    UPDATE products p SET
      rating = COALESCE(agg.avg_rating, 0),
      review_count = COALESCE(agg.cnt, 0)
    FROM (
      SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS cnt
      FROM reviews GROUP BY product_id
    ) agg
    WHERE agg.product_id = p.id
  `);

  seeded = true;
}
