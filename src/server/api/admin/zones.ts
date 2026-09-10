import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

const nullableInt = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.union([z.coerce.number().int().min(0), z.null()])
);

const upsertZone = z.object({
  city: z.string().trim().min(1).max(60),
  fee: z.coerce.number().int().min(0),
  freeOver: nullableInt.default(null),
  active: z.boolean().default(true),
});

const app = new Hono()
  .get("/", async (c) => {
    await requireAdminRequest(c.req.raw);
    const rows = await db
      .select()
      .from(shippingZones)
      .orderBy(asc(shippingZones.city));
    return c.json({ zones: rows });
  })
  .post("/", zValidator("json", upsertZone, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const input = c.req.valid("json");
    const [row] = await db
      .insert(shippingZones)
      .values({
        city: input.city,
        fee: input.fee,
        freeOver: input.freeOver,
        active: input.active,
      })
      .onConflictDoUpdate({
        target: shippingZones.city,
        set: { fee: input.fee, freeOver: input.freeOver, active: input.active },
      })
      .returning();
    return c.json({ zone: row }, 201);
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const zoneId = Number(c.req.param("id"));
    if (!Number.isInteger(zoneId)) {
      return c.json({ error: "Invalid zone id." }, 400);
    }
    const deleted = await db
      .delete(shippingZones)
      .where(eq(shippingZones.id, zoneId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Zone not found.");
    return c.json({ ok: true });
  });

export type AdminZonesRoute = typeof app;
export default app;
