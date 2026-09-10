import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const productId = Number(data.productId);
    const rating = Math.min(5, Math.max(1, Number(data.rating) || 5));
    const author = String(data.author ?? "").trim().slice(0, 80);
    const title = String(data.title ?? "").trim().slice(0, 140);
    const body = String(data.body ?? "").trim().slice(0, 2000);

    if (!productId || !author || !body) {
      return NextResponse.json(
        { error: "productId, author and body are required" },
        { status: 400 }
      );
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [review] = await db
      .insert(reviews)
      .values({ productId, rating, author, title, body })
      .returning();

    await db.execute(sql`
      UPDATE products p SET
        rating = agg.avg_rating,
        review_count = agg.cnt
      FROM (
        SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS cnt
        FROM reviews WHERE product_id = ${productId}
      ) agg
      WHERE p.id = ${productId}
    `);

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
