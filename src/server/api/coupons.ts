import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { previewCoupon } from "@/lib/coupons";
import { validationHook } from "../validate";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

const validateBody = z.object({
  code: z.string().max(40).default(""),
  subtotal: z.number().int().min(0).default(0),
});

const app = new Hono().post(
  "/validate",
  zValidator("json", validateBody, validationHook),
  async (c) => {
    if (isRateLimited(`coupon:${clientIp(c.req.raw)}`, 20, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");
    const result = await previewCoupon(input.code, input.subtotal);
    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ code: result.coupon.code, discount: result.discount });
  }
);

export type CouponsRoute = typeof app;
export default app;
