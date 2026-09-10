import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
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

async function parseProductBody(data: Record<string, unknown>) {
  const name = String(data.name ?? "").trim().slice(0, 160);
  const slug = slugify(String(data.slug || data.name || "")).slice(0, 160);
  const description = String(data.description ?? "").trim().slice(0, 5000);
  const details = parseList(data.details, "\n").slice(0, 30);
  const price = Math.max(0, Math.floor(Number(data.price) || 0));
  const compareRaw = Number(data.compareAtPrice);
  const compareAtPrice =
    Number.isFinite(compareRaw) && compareRaw > 0 ? Math.floor(compareRaw) : null;
  const categoryId = Number(data.categoryId);
  const images = parseList(data.images, "\n").slice(0, 10);
  const sizes = parseList(data.sizes, ",").slice(0, 20);
  const colors = parseList(data.colors, ",").slice(0, 20);
  const badge = String(data.badge ?? "").trim().slice(0, 40) || null;
  const featured = Boolean(data.featured);
  const stock = Math.max(0, Math.floor(Number(data.stock) || 0));

  if (!name || !slug || !description || !price || !Number.isInteger(categoryId)) {
    return { error: "Name, slug, description, price and category are required." };
  }
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId));
  if (!cat) return { error: "Category not found." };

  return {
    values: {
      name,
      slug,
      description,
      details,
      price,
      compareAtPrice,
      categoryId,
      images,
      sizes,
      colors,
      badge,
      featured,
      stock,
    },
  };
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const parsed = await parseProductBody(await request.json());
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const [row] = await db.insert(products).values(parsed.values).returning();
    return NextResponse.json({ product: row }, { status: 201 });
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
