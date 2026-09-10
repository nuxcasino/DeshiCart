import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { shippingForCity } from "@/lib/shipping";
import { validationHook } from "../validate";

const quoteQuery = z.object({
  city: z.string().max(60).default(""),
  subtotal: z.coerce.number().int().min(0).default(0),
});

const app = new Hono().get(
  "/quote",
  zValidator("query", quoteQuery, validationHook),
  async (c) => {
    const q = c.req.valid("query");
    return c.json({ shipping: await shippingForCity(q.city, q.subtotal) });
  }
);

export type ShippingRoute = typeof app;
export default app;
