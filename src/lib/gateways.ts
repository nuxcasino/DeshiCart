import { db } from "@/db";
import { paymentGateways, paymentTransactions, type PaymentGateway } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { decryptSecrets } from "./payment-security";
import { GATEWAY_DEFS } from "./payments/providers";

export type PublicGateway = {
  key: string;
  displayName: string;
  currency: string;
  extraFee: number;
  minAmount: number | null;
  maxAmount: number | null;
  sandbox: boolean;
  kind: "direct" | "redirect";
};

export type GatewayCreds = {
  storeId?: string;
  storePassword?: string;
  sandbox?: boolean;
  raw: Record<string, string>;
};

const DEFAULT_ROWS: Array<{
  key: string;
  priority: number;
  enabled: boolean;
  sandbox: boolean;
}> = [
  { key: "cod", priority: 1, enabled: true, sandbox: false },
  { key: "sslcommerz", priority: 2, enabled: true, sandbox: true },
  { key: "bkash", priority: 3, enabled: false, sandbox: true },
  { key: "nagad", priority: 4, enabled: false, sandbox: true },
  { key: "stripe", priority: 5, enabled: false, sandbox: true },
];

/** Seeds the gateway registry (idempotent). No secrets are seeded. */
export async function ensurePaymentGateways() {
  const existing = await db.select({ key: paymentGateways.key }).from(paymentGateways);
  const have = new Set(existing.map((r) => r.key));
  for (const row of DEFAULT_ROWS) {
    if (have.has(row.key)) continue;
    const def = GATEWAY_DEFS[row.key];
    if (!def) continue;
    await db
      .insert(paymentGateways)
      .values({
        key: row.key,
        displayName: def.displayName,
        enabled: row.enabled,
        sandbox: row.sandbox,
        currency: def.currency,
        priority: row.priority,
      })
      .onConflictDoNothing();
  }
}

const FALLBACK_GATEWAYS: PublicGateway[] = [
  { key: "cod", displayName: "Cash on Delivery", currency: "BDT", extraFee: 0, minAmount: null, maxAmount: null, sandbox: false, kind: "direct" },
  { key: "sslcommerz", displayName: "Online Payment", currency: "BDT", extraFee: 0, minAmount: null, maxAmount: null, sandbox: true, kind: "redirect" },
];

/** Public checkout config: enabled, not in maintenance. No secrets. */
export async function getAvailableGateways(): Promise<PublicGateway[]> {
  try {
    await ensurePaymentGateways();
    const rows = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.enabled, true))
      .orderBy(asc(paymentGateways.priority));
    return rows
      .filter((g) => !g.maintenance)
      .map((g) => ({
        key: g.key,
        displayName: g.displayName,
        currency: g.currency,
        extraFee: g.extraFee,
        minAmount: g.minAmount,
        maxAmount: g.maxAmount,
        sandbox: g.sandbox,
        kind: (isDirectGateway(g.key) ? "direct" : "redirect") as "direct" | "redirect",
      }));
  } catch {
    // Pre-migration database: Vercel push applies the tables on deploy.
    return FALLBACK_GATEWAYS;
  }
}

export async function getGatewayRow(key: string): Promise<PaymentGateway | null> {
  try {
    await ensurePaymentGateways();
    const [row] = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.key, key));
    return row ?? null;
  } catch {
    return null;
  }
}

/** Decrypted DB credentials for a gateway, or null when none stored. */
export function decryptGatewayCredentials(
  row: PaymentGateway
): Record<string, string> | null {
  if (!row.credentials) return null;
  try {
    return JSON.parse(decryptSecrets(row.credentials)) as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * SSLCommerz credential resolution: DB credentials win, else env fallback
 * (SSLCZ_*). Returns undefined when fully env-driven.
 */
export async function resolveSslcommerzCreds(): Promise<GatewayCreds | undefined> {
  const row = await getGatewayRow("sslcommerz");
  if (!row) return undefined;
  const stored = decryptGatewayCredentials(row);
  if (!stored?.storeId) return { sandbox: row.sandbox, raw: {} };
  return {
    storeId: stored.storeId,
    storePassword: stored.storePassword,
    sandbox: row.sandbox,
    raw: stored,
  };
}

/** Direct (no-redirect) methods complete inside /api/orders; everything else
 * must start at /api/payments/init. Keeps provider knowledge in one place. */
export function isDirectGateway(key: string): boolean {
  return key === "cod";
}

/** Audit-trail writer (§25). Never call with secrets or card data. */
export async function logTransaction(input: {
  orderId?: number | null;
  gateway: string;
  tranRef?: string | null;
  gatewayRef?: string | null;
  amount?: number | null;
  currency?: string;
  status: string;
  message?: string | null;
}): Promise<void> {
  try {
    await db.insert(paymentTransactions).values({
      orderId: input.orderId ?? null,
      gateway: input.gateway,
      tranRef: input.tranRef ?? null,
      gatewayRef: input.gatewayRef ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? "BDT",
      status: input.status,
      message: input.message?.slice(0, 500) ?? null,
    });
  } catch {
    // audit trail must never break payments
  }
}
