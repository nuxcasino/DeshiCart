import type { Order } from "@/db/schema";

// Payment provider abstraction (§23). Checkout talks to this interface only;
// adding a provider = new adapter + gateway row, no checkout rewrite.

export type ProviderInitArgs = {
  order: Order;
  siteUrl: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
  };
  productNames: string;
};

export type ProviderInitResult =
  | { kind: "redirect"; gatewayUrl: string }
  | { kind: "direct" };

export interface PaymentProvider {
  key: string;
  /** Throws on misconfiguration/unreachable gateway. */
  initPayment(
    args: ProviderInitArgs,
    opts?: { storeId?: string; storePassword?: string; sandbox?: boolean }
  ): Promise<ProviderInitResult>;
}

/** Credential field definitions per gateway (drives the admin form). */
export type CredentialField = {
  name: string;
  label: string;
  secret: boolean;
  help?: string;
};

export const GATEWAY_DEFS: Record<
  string,
  {
    displayName: string;
    currency: string;
    credentialFields: CredentialField[];
    description: string;
  }
> = {
  cod: {
    displayName: "Cash on Delivery",
    currency: "BDT",
    credentialFields: [],
    description: "Pay in cash when the order arrives. No credentials needed.",
  },
  sslcommerz: {
    displayName: "SSLCommerz",
    currency: "BDT",
    credentialFields: [
      { name: "storeId", label: "Store ID", secret: false },
      { name: "storePassword", label: "Store Password", secret: true },
    ],
    description: "bKash, Nagad, cards, netbanking via SSLCommerz.",
  },
  bkash: {
    displayName: "bKash (direct)",
    currency: "BDT",
    credentialFields: [
      { name: "appKey", label: "App Key", secret: true },
      { name: "appSecret", label: "App Secret", secret: true },
      { name: "username", label: "Username", secret: false },
      { name: "password", label: "Password", secret: true },
    ],
    description: "Direct bKash PGW adapter (not yet implemented).",
  },
  nagad: {
    displayName: "Nagad (direct)",
    currency: "BDT",
    credentialFields: [
      { name: "merchantId", label: "Merchant ID", secret: false },
      { name: "merchantNumber", label: "Merchant Number", secret: false },
      { name: "publicKey", label: "PG Public Key", secret: true },
      { name: "privateKey", label: "Merchant Private Key", secret: true },
    ],
    description: "Direct Nagad PGW adapter (not yet implemented).",
  },
  stripe: {
    displayName: "Stripe",
    currency: "USD",
    credentialFields: [
      { name: "publishableKey", label: "Publishable Key", secret: false },
      { name: "secretKey", label: "Secret Key", secret: true },
      { name: "webhookSecret", label: "Webhook Secret", secret: true },
    ],
    description: "International cards via Stripe (not yet implemented).",
  },
};
