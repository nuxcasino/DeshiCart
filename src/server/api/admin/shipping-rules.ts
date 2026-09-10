import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { districts, divisions, shippingRules, upazilas } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";

const upsertRule = z.object({
  scope: z.enum(["division", "district", "upazila"]),
  refId: z.string().trim().min(1).max(20),
  fee: z.coerce.number().int().min(0),
  freeOver: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.union([z.coerce.number().int().min(0), z.null()])
  ).default(null),
  active: z.boolean().default(true),
});

async function refExists(scope: string, refId: string): Promise<boolean> {
  if (scope === "division") {
    const rows = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.id, refId)).limit(1);
    return rows.length > 0;
  }
  if (scope === "district") {
    const rows = await db.select({ id: districts.id }).from(districts).where(eq(districts.id, refId)).limit(1);
    return rows.length > 0;
  }
  const rows = await db.select({ id: upazilas.id }).from(upazilas).where(eq(upazilas.id, refId)).limit(1);
  return rows.length > 0;
}

const app = new Hono()
  .get("/", async (c) => {
    await requireAdminRequest(c.req.raw);
    const rows = await db
      .select()
      .from(shippingRules)
      .orderBy(asc(shippingRules.scope), asc(shippingRules.refId));
    return c.json({ rules: rows });
  })
  .post("/", zValidator("json", upsertRule, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const input = c.req.valid("json");
    if (!(await refExists(input.scope, input.refId))) {
      return c.json({ error: "Unknown location reference." }, 400);
    }
    const [row] = await db
      .insert(shippingRules)
      .values({
        scope: input.scope,
        refId: input.refId,
        fee: input.fee,
        freeOver: input.freeOver,
        active: input.active,
      })
      .onConflictDoUpdate({
        target: [shippingRules.scope, shippingRules.refId],
        set: { fee: input.fee, freeOver: input.freeOver, active: input.active },
      })
      .returning();
    return c.json({ rule: row }, 201);
  })
  .delete("/:id", async (c) => {
    await requireAdminRequest(c.req.raw);
    const ruleId = Number(c.req.param("id"));
    if (!Number.isInteger(ruleId)) {
      return c.json({ error: "Invalid rule id." }, 400);
    }
    const deleted = await db
      .delete(shippingRules)
      .where(eq(shippingRules.id, ruleId))
      .returning();
    if (deleted.length === 0) throw new NotFoundError("Rule not found.");
    return c.json({ ok: true });
  });

export type AdminShippingRulesRoute = typeof app;
export default app;
