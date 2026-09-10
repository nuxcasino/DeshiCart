import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { quoteShipping } from "@/lib/locations";
import { validationHook } from "../validate";

const quoteQuery = z.object({
  city: z.string().max(60).default(""),
  divisionId: z.string().max(20).default(""),
  districtId: z.string().max(20).default(""),
  upazilaId: z.string().max(20).default(""),
  subtotal: z.coerce.number().int().min(0).default(0),
});

const app = new Hono().get(
  "/quote",
  zValidator("query", quoteQuery, validationHook),
  async (c) => {
    const q = c.req.valid("query");
    return c.json({
      shipping: await quoteShipping({
        city: q.city,
        divisionId: q.divisionId || null,
        districtId: q.districtId || null,
        upazilaId: q.upazilaId || null,
        subtotal: q.subtotal,
      }),
    });
  }
);

export type ShippingRoute = typeof app;
export default app;
