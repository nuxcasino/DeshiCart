import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, wishlistItems } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
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
  return NextResponse.json({
    items: rows
      .map((r) => byId.get(r.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    productIds: rows.map((r) => r.productId),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const data = await request.json();
    const productId = Number(data.productId);
    if (!Number.isInteger(productId)) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    // Toggle: already saved → remove (idempotent wishlist button).
    const [existing] = await db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, user.id),
          eq(wishlistItems.productId, productId)
        )
      );
    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return NextResponse.json({ saved: false });
    }
    await db.insert(wishlistItems).values({ userId: user.id, productId });
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
