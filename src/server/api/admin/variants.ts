import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, productVariants, products } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { ConflictError, NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

const variantBody = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().trim().min(1).max(60),
  color: z.string().trim().max(40).default(""),
  size: z.string().trim().max(40).default(""),
  price: z.coerce.number().int().min(0),
  compareAtPrice: z.union([z.coerce.number().int().min(0), z.null()]).default(null),
  stock: z.coerce.number().int().min(0),
  image: z.string().trim().max(500).default(""),
  barcode: z.string().trim().max(60).default(""),
  weightGrams: z.union([z.coerce.number().int().positive(), z.null()]).default(null),
  isActive: z.boolean().default(true),
});

const variantPatch = variantBody
  .omit({ productId: true })
  .partial();

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /unique|duplicate/i.test(e.message);
}

async function assertNoComboClash(
  productId: number,
  color: string,
  size: string,
  exceptId?: number
): Promise<boolean> {
  const clash = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.color, color),
        eq(productVariants.size, size),
        ...(exceptId !== undefined ? [ne(productVariants.id, exceptId)] : [])
      )
    )
    .limit(1);
  return clash.length > 0;
}

const app = new Hono()
  .post("/", zValidator("json", variantBody, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const input = c.req.valid("json");

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId));
    if (!product) throw new NotFoundError("Product not found.");

    if (await assertNoComboClash(input.productId, input.color, input.size)) {
      throw new ConflictError(
        `Variant "${input.color} / ${input.size}" already exists for this product.`
      );
    }

    try {
      const [row] = await db
        .insert(productVariants)
        .values({
          productId: input.productId,
          sku: input.sku.toUpperCase(),
          color: input.color,
          size: input.size,
          price: Math.floor(input.price),
          compareAtPrice:
            input.compareAtPrice !== null && input.compareAtPrice > 0
              ? Math.floor(input.compareAtPrice)
              : null,
          stock: Math.floor(input.stock),
          image: input.image,
          barcode: input.barcode,
          weightGrams: input.weightGrams,
          isActive: input.isActive,
        })
        .returning();
      return c.json({ variant: row }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictError("SKU or color/size combination already exists.");
      }
      throw e;
    }
  })
  .patch("/:id", zValidator("json", variantPatch, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const variantId = Number(c.req.param("id"));
    if (!Number.isInteger(variantId)) {
      return c.json({ error: "Invalid variant id." }, 400);
    }
    const [existing] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    if (!existing) throw new NotFoundError("Variant not found.");

    const input = c.req.valid("json");
    const nextColor = input.color ?? existing.color;
    const nextSize = input.size ?? existing.size;
    if (
      (nextColor !== existing.color || nextSize !== existing.size) &&
      (await assertNoComboClash(existing.productId, nextColor, nextSize, variantId))
    ) {
      throw new ConflictError(
        `Variant "${nextColor} / ${nextSize}" already exists for this product.`
      );
    }

    const values: Record<string, unknown> = {};
    if (input.sku !== undefined) values.sku = input.sku.toUpperCase();
    if (input.color !== undefined) values.color = input.color;
    if (input.size !== undefined) values.size = input.size;
    if (input.price !== undefined) values.price = Math.floor(input.price);
    if (input.compareAtPrice !== undefined)
      values.compareAtPrice =
        input.compareAtPrice !== null && input.compareAtPrice > 0
          ? Math.floor(input.compareAtPrice)
          : null;
    if (input.stock !== undefined) values.stock = Math.floor(input.stock);
    if (input.image !== undefined) values.image = input.image;
    if (input.barcode !== undefined) values.barcode = input.barcode;
    if (input.weightGrams !== undefined) values.weightGrams = input.weightGrams;
    if (input.isActive !== undefined) values.isActive = input.isActive;
    if (Object.keys(values).length === 0) {
      return c.json({ error: "Nothing to update." }, 400);
    }

    try {
      const [updated] = await db
        .update(productVariants)
        .set(values)
        .where(eq(productVariants.id, variantId))
        .returning();
      if (!updated) throw new NotFoundError("Variant not found.");
      return c.json({ variant: updated });
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      if (isUniqueViolation(e)) {
        throw new ConflictError("SKU or color/size combination already exists.");
      }
      throw e;
    }
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const variantId = Number(c.req.param("id"));
    if (!Number.isInteger(variantId)) {
      return c.json({ error: "Invalid variant id." }, 400);
    }
    const used = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.variantId, variantId))
      .limit(1);
    if (used.length > 0) {
      throw new ConflictError(
        "Variant has order history. Deactivate it instead of deleting."
      );
    }
    const deleted = await db
      .delete(productVariants)
      .where(eq(productVariants.id, variantId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Variant not found.");
    return c.json({ ok: true });
  });

export type AdminVariantsRoute = typeof app;
export default app;
