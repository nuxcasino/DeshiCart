import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { productImages, products, type ProductImage } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";
import { getImageProvider } from "@/lib/images";
import { getProductImageRows, syncProductImages } from "@/lib/product-images";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_PRODUCT = 10;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const updateImage = z.object({
  alt: z.string().trim().max(160).optional(),
  position: z.coerce.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

const app = new Hono()
  .post("/", async (c) => {
    await requireAdminRequest(c.req.raw);
    const provider = getImageProvider();
    if (!provider.configured()) {
      return c.json(
        {
          error:
            "Image storage is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.",
        },
        400
      );
    }

    let form;
    try {
      form = await c.req.parseBody();
    } catch {
      return c.json({ error: "Invalid upload." }, 400);
    }
    const productId = Number(form["productId"]);
    const files: File[] = [];
    for (const value of Object.values(form)) {
      const list = Array.isArray(value) ? value : [value];
      for (const v of list) {
        if (v instanceof File && v.size > 0) files.push(v);
      }
    }
    const batch = files.slice(0, MAX_PER_PRODUCT);
    if (!Number.isInteger(productId)) {
      return c.json({ error: "productId is required." }, 400);
    }
    if (files.length === 0) {
      return c.json({ error: "No image file received." }, 400);
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) throw new NotFoundError("Product not found.");

    const existing = await getProductImageRows(productId);
    if (existing.length + files.length > MAX_PER_PRODUCT) {
      return c.json(
        { error: `At most ${MAX_PER_PRODUCT} images per product.` },
        400
      );
    }

    const created = [];
    let position = existing.length;
    for (const file of batch) {
      if (!ALLOWED_MIME.has(file.type)) {
        return c.json(
          { error: `"${file.name || "file"}" must be JPEG, PNG or WebP.` },
          400
        );
      }
      if (file.size > MAX_BYTES) {
        return c.json(
          { error: `"${file.name || "file"}" exceeds the 5 MB limit.` },
          400
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      let uploaded;
      try {
        uploaded = await provider.upload({
          buffer,
          fileName: file.name || `product-${productId}.jpg`,
        });
      } catch (e) {
        return c.json(
          { error: e instanceof Error ? e.message : "Upload failed." },
          502
        );
      }
      const [row]: ProductImage[] = await db
        .insert(productImages)
        .values({
          productId,
          url: uploaded.url,
          fileId: uploaded.fileId,
          width: uploaded.width,
          height: uploaded.height,
          alt: "",
          position,
          isPrimary: existing.length === 0 && created.length === 0,
        })
        .returning();
      position += 1;
      created.push(row);
    }

    await syncProductImages(productId);
    return c.json({ images: created }, 201);
  })
  .patch("/:id", zValidator("json", updateImage, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const imageId = Number(c.req.param("id"));
    if (!Number.isInteger(imageId)) {
      return c.json({ error: "Invalid image id." }, 400);
    }
    const [row] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.id, imageId));
    if (!row) throw new NotFoundError("Image not found.");

    const input = c.req.valid("json");
    if (input.isPrimary === true) {
      await db
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, row.productId));
    }
    const values: Record<string, unknown> = {};
    if (input.alt !== undefined) values.alt = input.alt;
    if (input.position !== undefined) values.position = input.position;
    if (input.isPrimary !== undefined) values.isPrimary = input.isPrimary;
    if (Object.keys(values).length === 0) {
      return c.json({ error: "Nothing to update." }, 400);
    }
    const [updated] = await db
      .update(productImages)
      .set(values)
      .where(eq(productImages.id, imageId))
      .returning();
    if (!updated) throw new NotFoundError("Image not found.");
    await syncProductImages(row.productId);
    return c.json({ image: updated });
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const imageId = Number(c.req.param("id"));
    if (!Number.isInteger(imageId)) {
      return c.json({ error: "Invalid image id." }, 400);
    }
    const [row] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.id, imageId));
    if (!row) throw new NotFoundError("Image not found.");

    if (row.fileId) {
      try {
        await getImageProvider().delete(row.fileId);
      } catch {
        // CDN best-effort: still remove the row so admin isn't stuck.
      }
    }
    await db.delete(productImages).where(eq(productImages.id, imageId));

    // Promote the next image when the primary was removed.
    const remaining = await getProductImageRows(row.productId);
    if (remaining.length > 0 && !remaining.some((r) => r.isPrimary)) {
      await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, remaining[0].id));
    }
    await syncProductImages(row.productId);
    return c.json({ ok: true });
  });

export type AdminImagesRoute = typeof app;
export default app;
