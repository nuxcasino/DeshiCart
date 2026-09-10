import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

async function recalcProductRating(productId: number) {
  await db.execute(sql`
    UPDATE products p SET
      rating = COALESCE(agg.avg_rating, 0),
      review_count = COALESCE(agg.cnt, 0)
    FROM (
      SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS cnt
      FROM reviews WHERE product_id = ${productId}
    ) agg
    WHERE p.id = ${productId}
  `);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }
  try {
    const data = await request.json();
    if (typeof data.verified !== "boolean") {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const [updated] = await db
      .update(reviews)
      .set({ verified: data.verified })
      .where(eq(reviews.id, reviewId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({ review: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }
  const [row] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!row) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  await recalcProductRating(row.productId);
  return NextResponse.json({ ok: true });
}
