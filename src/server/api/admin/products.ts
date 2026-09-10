import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { categories, products, reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

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

const productBody = z.object({
  name: z.string().trim().min(1).max(160),
  nameBn: z.string().trim().max(160).default(""),
  slug: z.string().trim().max(160).default(""),
  description: z.string().trim().min(1).max(5000),
  descriptionBn: z.string().trim().max(5000).default(""),
  details: z.string().max(2000).default(""),
  detailsBn: z.string().max(2000).default(""),
  price: z.coerce.number().int().min(1),
  compareAtPrice: z.coerce.number().int().min(0).default(0),
  categoryId: z.coerce.number().int().positive(),
  images: z.string().max(5000).default(""),
  sizes: z.string().max(500).default(""),
  colors: z.string().max(500).default(""),
  badge: z.string().trim().max(40).default(""),
  featured: z.boolean().default(false),
  stock: z.coerce.number().int().min(0),
});

const productPatch = productBody.partial();

type ProductValues = {
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  descriptionBn: string;
  details: string[];
  detailsBn: string[];
  price: number;
  compareAtPrice: number | null;
  categoryId: number;
  images: string[];
  sizes: string[];
  colors: string[];
  badge: string | null;
  featured: boolean;
  stock: number;
};

async function toValues(
  input: z.infer<typeof productBody> | z.infer<typeof productPatch>,
  partial: boolean
): Promise<{ values?: ProductValues; error?: string }> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.nameBn !== undefined) out.nameBn = input.nameBn;
  if (input.slug !== undefined || !partial)
    out.slug = slugify(String(input.slug || ("name" in input ? input.name : "")));
  if (input.description !== undefined) out.description = input.description;
  if (input.descriptionBn !== undefined) out.descriptionBn = input.descriptionBn;
  if (input.details !== undefined) out.details = parseList(input.details, "\n").slice(0, 30);
  if (input.detailsBn !== undefined)
    out.detailsBn = parseList(input.detailsBn, "\n").slice(0, 30);
  if (input.price !== undefined) out.price = Math.max(0, Math.floor(input.price));
  if (input.compareAtPrice !== undefined)
    out.compareAtPrice = input.compareAtPrice > 0 ? Math.floor(input.compareAtPrice) : null;
  if (input.categoryId !== undefined) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId));
    if (!cat) return { error: "Category not found." };
    out.categoryId = input.categoryId;
  }
  if (input.images !== undefined) out.images = parseList(input.images, "\n").slice(0, 10);
  if (input.sizes !== undefined) out.sizes = parseList(input.sizes, ",").slice(0, 20);
  if (input.colors !== undefined) out.colors = parseList(input.colors, ",").slice(0, 20);
  if (input.badge !== undefined) out.badge = input.badge.trim() || null;
  if (input.featured !== undefined) out.featured = input.featured;
  if (input.stock !== undefined) out.stock = Math.max(0, Math.floor(input.stock));

  if (!partial) {
    for (const key of ["name", "slug", "description", "price", "categoryId", "stock"] as const) {
      if (out[key] === undefined || out[key] === "") {
        return { error: "Name, slug, description, price, category and stock are required." };
      }
    }
    if (!out.slug) return { error: "Slug is required." };
  }
  return { values: out as ProductValues };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /unique|duplicate/i.test(e.message);
}

const app = new Hono()
  .post("/", zValidator("json", productBody, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const parsed = await toValues(c.req.valid("json"), false);
    if (parsed.error || !parsed.values) {
      return c.json({ error: parsed.error ?? "Invalid input." }, 400);
    }
    try {
      const [row] = await db.insert(products).values(parsed.values).returning();
      return c.json({ product: row }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) {
        return c.json({ error: "Slug already exists. Use a unique slug." }, 409);
      }
      throw e;
    }
  })
  .patch("/:id", zValidator("json", productPatch, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const productId = Number(c.req.param("id"));
    if (!Number.isInteger(productId)) {
      return c.json({ error: "Invalid product id." }, 400);
    }
    const parsed = await toValues(c.req.valid("json"), true);
    if (parsed.error || !parsed.values) {
      return c.json({ error: parsed.error ?? "Invalid input." }, 400);
    }
    if (Object.keys(parsed.values).length === 0) {
      return c.json({ error: "Nothing to update." }, 400);
    }
    try {
      const [updated] = await db
        .update(products)
        .set(parsed.values)
        .where(eq(products.id, productId))
        .returning();
      if (!updated) throw new NotFoundError("Product not found.");
      return c.json({ product: updated });
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      if (isUniqueViolation(e)) {
        return c.json({ error: "Slug already exists. Use a unique slug." }, 409);
      }
      throw e;
    }
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const productId = Number(c.req.param("id"));
    if (!Number.isInteger(productId)) {
      return c.json({ error: "Invalid product id." }, 400);
    }
    await db.delete(reviews).where(eq(reviews.productId, productId));
    const deleted = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Product not found.");
    return c.json({ ok: true });
  });

export type AdminProductsRoute = typeof app;
export default app;
