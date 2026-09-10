import { Hono } from "hono";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const app = new Hono().get("/", async (c) => {
  try {
    await db.execute(sql`select 1`);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 500);
  }
});

export type HealthRoute = typeof app;
export default app;
