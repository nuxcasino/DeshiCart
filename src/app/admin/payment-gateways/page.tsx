import { db } from "@/db";
import { paymentGateways } from "@/db/schema";
import { asc } from "drizzle-orm";
import { GATEWAY_DEFS } from "@/lib/payments/providers";
import GatewayManager from "@/components/GatewayManager";

export const dynamic = "force-dynamic";

export default async function AdminGatewaysPage() {
  const rows = await db
    .select()
    .from(paymentGateways)
    .orderBy(asc(paymentGateways.priority));

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Payment gateways
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Enable, sandbox, limit and price gateways without touching code. Secrets
        are AES-256-GCM encrypted and never leave the server — they require
        PAYMENT_CREDENTIALS_KEY in the server environment.
      </p>
      <div className="mt-4">
        <GatewayManager
          initial={rows.map((g) => ({
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
          }))}
        />
      </div>
    </div>
  );
}
