import { Hono } from "hono";
import { getAvailableGateways } from "@/lib/gateways";

const app = new Hono().get("/", async (c) => {
  return c.json({ gateways: await getAvailableGateways() });
});

export type PaymentGatewaysRoute = typeof app;
export default app;
