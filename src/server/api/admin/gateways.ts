import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { paymentGateways } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminRequest } from "../../admin-guard";
import { NotFoundError } from "../../errors";
import { validationHook } from "../../validate";
import { decryptGatewayCredentials, getGatewayRow } from "@/lib/gateways";
import {
  decryptSecrets,
  encryptSecrets,
  hasCredentialsKey,
} from "@/lib/payment-security";
import { GATEWAY_DEFS } from "@/lib/payments/providers";

const updateGateway = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
  sandbox: z.boolean().optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  minAmount: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  maxAmount: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  extraFee: z.coerce.number().int().min(0).optional(),
  priority: z.coerce.number().int().min(0).optional(),
  maintenance: z.boolean().optional(),
  credentials: z.record(z.string(), z.string().max(500)).optional(),
});

const app = new Hono()
  .get("/", async (c) => {
    await requireAdminRequest(c.req.raw);
    const rows = await db
      .select()
      .from(paymentGateways)
      .orderBy(asc(paymentGateways.priority));
    return c.json({
      credentialsKeySet: hasCredentialsKey(),
      gateways: rows.map((g) => ({
        id: g.id,
        key: g.key,
        displayName: g.displayName,
        enabled: g.enabled,
        sandbox: g.sandbox,
        currency: g.currency,
        minAmount: g.minAmount,
        maxAmount: g.maxAmount,
        extraFee: g.extraFee,
        priority: g.priority,
        maintenance: g.maintenance,
        hasCredentials: g.credentials !== "",
        fields: GATEWAY_DEFS[g.key]?.credentialFields ?? [],
        description: GATEWAY_DEFS[g.key]?.description ?? "",
      })),
    });
  })
  .patch("/:key", zValidator("json", updateGateway, validationHook), async (c) => {
    await requireAdminRequest(c.req.raw);
    const key = c.req.param("key");
    const row = await getGatewayRow(key);
    if (!row) throw new NotFoundError("Gateway not found.");
    const input = c.req.valid("json");

    const values: Record<string, unknown> = {};
    if (input.displayName !== undefined) values.displayName = input.displayName;
    if (input.enabled !== undefined) values.enabled = input.enabled;
    if (input.sandbox !== undefined) values.sandbox = input.sandbox;
    if (input.currency !== undefined) values.currency = input.currency.toUpperCase();
    if (input.minAmount !== undefined) values.minAmount = input.minAmount;
    if (input.maxAmount !== undefined) values.maxAmount = input.maxAmount;
    if (input.extraFee !== undefined) values.extraFee = input.extraFee;
    if (input.priority !== undefined) values.priority = input.priority;
    if (input.maintenance !== undefined) values.maintenance = input.maintenance;

    if (input.credentials !== undefined) {
      const incoming = Object.fromEntries(
        Object.entries(input.credentials).filter(([, v]) => v !== "")
      );
      if (Object.keys(incoming).length > 0) {
        if (!hasCredentialsKey()) {
          return c.json(
            {
              error:
                "PAYMENT_CREDENTIALS_KEY is not set. Generate one (openssl rand -hex 32) and add it to the server environment first.",
            },
            400
          );
        }
        let merged: Record<string, string> = {};
        if (row.credentials) {
          try {
            merged = JSON.parse(decryptSecrets(row.credentials)) as Record<string, string>;
          } catch {
            return c.json(
              { error: "Existing credentials cannot be decrypted with the current key." },
              400
            );
          }
        }
        values.credentials = encryptSecrets(
          JSON.stringify({ ...merged, ...incoming })
        );
      }
    }

    if (Object.keys(values).length === 0) {
      return c.json({ error: "Nothing to update." }, 400);
    }
    const [updated] = await db
      .update(paymentGateways)
      .set(values)
      .where(eq(paymentGateways.key, key))
      .returning();
    if (!updated) throw new NotFoundError("Gateway not found.");
    return c.json({ ok: true, hasCredentials: updated.credentials !== "" });
  })
  .post("/:key/test", async (c) => {
    await requireAdminRequest(c.req.raw);
    const key = c.req.param("key");
    const row = await getGatewayRow(key);
    if (!row) throw new NotFoundError("Gateway not found.");
    if (key === "cod") {
      return c.json({ ok: true, message: "Cash on Delivery needs no connection." });
    }
    if (key !== "sslcommerz") {
      return c.json(
        { ok: false, message: "No adapter implemented for this gateway yet." },
        400
      );
    }
    const stored = decryptGatewayCredentials(row);
    const storeId = stored?.storeId || process.env.SSLCZ_STORE_ID;
    const storePassword = stored?.storePassword || process.env.SSLCZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      return c.json(
        { ok: false, message: "Store ID / password are not configured." },
        400
      );
    }
    // Reachability + TLS check against the gateway base (no transaction made).
    const base = row.sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    try {
      const res = await fetch(base, { method: "HEAD" });
      void res.status;
      return c.json({
        ok: true,
        message: `Reachable (${row.sandbox ? "sandbox" : "live"}) with credentials configured.`,
      });
    } catch (e) {
      return c.json(
        {
          ok: false,
          message: e instanceof Error ? `Unreachable: ${e.message}` : "Unreachable.",
        },
        502
      );
    }
  });

export type AdminGatewaysRoute = typeof app;
export default app;
