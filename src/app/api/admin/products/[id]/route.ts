import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseList(input: unknown, sep: "," | "\n"): string[] {
  return String(input ?? "")
    .split(sep === "," ? "," : "\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }
  try {
    const data = await request.json();
    const values: Record<string, unknown> = {};
    if (data.name !== undefined) values.name = String(data.name).trim().slice(0, 160);
    if (data.slug !== undefined)
      values.slug = slugify(String(data.slug)).slice(0, 160);
    if (data.description !== undefined)
      values.description = String(data.description).trim().slice(0, 5000);
    if (data.details !== undefined)
      values.details = parseList(data.details, "\n").slice(0, 30);
    if (data.price !== undefined)
      values.price = Math.max(0, Math.floor(Number(data.price) || 0));
    if (data.compareAtPrice !== undefined) {
      const n = Number(data.compareAtPrice);
      values.compareAtPrice =
        Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
    if (data.categoryId !== undefined) values.categoryId = Number(data.categoryId);
    if (data.images !== undefined)
      values.images = parseList(data.images, "\n").slice(0, 10);
    if (data.sizes !== undefined)
      values.sizes = parseList(data.sizes, ",").slice(0, 20);
    if (data.colors !== undefined)
      values.colors = parseList(data.colors, ",").slice(0, 20);
    if (data.badge !== undefined)
      values.badge = String(data.badge).trim().slice(0, 40) || null;
    if (data.featured !== undefined) values.featured = Boolean(data.featured);
    if (data.stock !== undefined)
      values.stock = Math.max(0, Math.floor(Number(data.stock) || 0));

    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const [updated] = await db
      .update(products)
      .set(values)
      .where(eq(products.id, productId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ product: updated });
  } catch (e) {
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
      return NextResponse.json(
        { error: "Slug already exists. Use a unique slug." },
        { status: 409 }
      );
    }
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
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }
  // reviews.product_id references products.id, so remove the product's
  // reviews first. Order_items only snapshot product data and are unaffected.
  await db.delete(reviews).where(eq(reviews.productId, productId));
  const deleted = await db
    .delete(products)
    .where(eq(products.id, productId))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
