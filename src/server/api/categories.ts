import { Hono } from "hono";
import { getCategories } from "@/lib/data";

const app = new Hono().get("/", async (c) => {
  const rows = await getCategories();
  return c.json({ categories: rows });
});

export type CategoriesRoute = typeof app;
export default app;
