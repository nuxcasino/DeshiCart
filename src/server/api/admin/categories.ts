import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { ConflictError, NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createCategory = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).default(""),
  tagline: z.string().trim().max(160).default(""),
  image: z.string().trim().max(500).default(""),
});

const app = new Hono()
  .post("/", zValidator("json", createCategory, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const input = c.req.valid("json");
    const slug = slugify(input.slug || input.name);
    if (!slug) return c.json({ error: "Name is required." }, 400);
    try {
      const [row] = await db
        .insert(categories)
        .values({ name: input.name, slug, tagline: input.tagline, image: input.image })
        .returning();
      return c.json({ category: row }, 201);
    } catch (e) {
      if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
        return c.json({ error: "Slug already exists." }, 409);
      }
      throw e;
    }
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const categoryId = Number(c.req.param("id"));
    if (!Number.isInteger(categoryId)) {
      return c.json({ error: "Invalid category id." }, 400);
    }
    const using = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .limit(1);
    if (using.length > 0) {
      throw new ConflictError("Category has products. Move them first.");
    }
    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, categoryId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Category not found.");
    return c.json({ ok: true });
  });

export type AdminCategoriesRoute = typeof app;
export default app;
