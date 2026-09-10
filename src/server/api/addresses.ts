import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";
import { AuthenticationError, NotFoundError } from "../errors";
import { validationHook } from "../validate";

const createAddress = z.object({
  label: z.string().trim().max(30).default("Home"),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(20),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(60),
  postcode: z.string().trim().max(20).default(""),
  isDefault: z.boolean().default(false),
});

const setDefault = z.object({
  isDefault: z.boolean(),
});

const app = new Hono()
  .get("/", async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(asc(addresses.id));
    return c.json({ addresses: rows });
  })
  .post("/", zValidator("json", createAddress, validationHook), async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const input = c.req.valid("json");

    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, user.id));
    const makeDefault = input.isDefault || existing.length === 0;
    if (makeDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, user.id));
    }

    const [row] = await db
      .insert(addresses)
      .values({
        userId: user.id,
        label: input.label || "Home",
        name: input.name,
        phone: input.phone,
        address: input.address,
        city: input.city,
        postcode: input.postcode,
        isDefault: makeDefault,
      })
      .returning();
    return c.json({ address: row }, 201);
  })
  .patch("/:id", zValidator("json", setDefault, validationHook), async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const id = Number(c.req.param("id"));
    const [row] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
    if (!row) throw new NotFoundError("Address not found.");

    if (c.req.valid("json").isDefault === true) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, user.id));
      const [updated] = await db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, row.id))
        .returning();
      return c.json({ address: updated });
    }
    return c.json({ address: row });
  })
  .delete("/:id", async (c) => {
    const user = await getSessionUserFromRequest(c.req.raw);
    if (!user) throw new AuthenticationError();
    const id = Number(c.req.param("id"));
    const [row] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
    if (!row) throw new NotFoundError("Address not found.");

    await db.delete(addresses).where(eq(addresses.id, row.id));
    if (row.isDefault) {
      const [next] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, user.id))
        .orderBy(asc(addresses.id));
      if (next) {
        await db
          .update(addresses)
          .set({ isDefault: true })
          .where(eq(addresses.id, next.id));
      }
    }
    return c.json({ ok: true });
  });

export type AddressesRoute = typeof app;
export default app;
