import { db } from "@/db";
import { categories, products, reviews } from "@/db/schema";
import type { Product } from "@/db/schema";
import { and, asc, desc, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import { ensureSeeded } from "./seed";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "rating";

export type ShopFilters = {
  category?: string;
  sort?: SortKey;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
};

export async function getCategories() {
  await ensureSeeded();
  return db.select().from(categories).orderBy(asc(categories.id));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  await ensureSeeded();
  return db
    .select()
    .from(products)
    .where(eq(products.featured, true))
    .orderBy(desc(products.rating))
    .limit(8);
}

export async function getShopProducts(filters: ShopFilters) {
  await ensureSeeded();

  const conditions: SQL[] = [];

  if (filters.category && filters.category !== "all") {
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, filters.category));
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(products.price, filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(products.price, filters.maxPrice));
  }
  if (filters.q) {
    conditions.push(
      sql`(${products.name} ILIKE ${"%" + filters.q + "%"} OR ${products.description} ILIKE ${"%" + filters.q + "%"} OR ${products.nameBn} ILIKE ${"%" + filters.q + "%"} OR ${products.descriptionBn} ILIKE ${"%" + filters.q + "%"})`
    );
  }

  const orderBy = (() => {
    switch (filters.sort) {
      case "newest":
        return [desc(products.createdAt)];
      case "price-asc":
        return [asc(products.price)];
      case "price-desc":
        return [desc(products.price)];
      case "rating":
        return [desc(products.rating), desc(products.reviewCount)];
      default:
        return [desc(products.featured), desc(products.rating)];
    }
  })();

  return db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(...orderBy);
}

export async function getProductBySlug(slug: string) {
  await ensureSeeded();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));
  return product ?? null;
}

export async function getProductReviews(productId: number) {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
}

export async function getRelatedProducts(product: Product) {
  const related = await db
    .select()
    .from(products)
    .where(
      and(eq(products.categoryId, product.categoryId), ne(products.id, product.id))
    )
    .limit(4);
  if (related.length < 4) {
    const more = await db
      .select()
      .from(products)
      .where(
        and(ne(products.categoryId, product.categoryId), ne(products.id, product.id))
      )
      .orderBy(desc(products.rating))
      .limit(4 - related.length);
    related.push(...more);
  }
  return related;
}

export async function getCategoryById(id: number) {
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  return cat ?? null;
}
