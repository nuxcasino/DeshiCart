// Server-only SSLCommerz helpers (never import from client components).
// Docs: https://developer.sslcommerz.com (Initiate Payment + Order Validation APIs)

export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  sandbox: boolean;
  base: string;
};

export function getSslcommerzConfig(overrides?: {
  storeId?: string;
  storePassword?: string;
  sandbox?: boolean;
}): SslcommerzConfig {
  const storeId = overrides?.storeId || process.env.SSLCZ_STORE_ID;
  const storePassword = overrides?.storePassword || process.env.SSLCZ_STORE_PASSWORD;
  if (!storeId || !storePassword) {
    throw new Error(
      "SSLCZ_STORE_ID / SSLCZ_STORE_PASSWORD are required for online payments"
    );
  }
  const sandbox =
    overrides?.sandbox ??
    (process.env.SSLCZ_SANDBOX ?? "true").toLowerCase() !== "false";
  return {
    storeId,
    storePassword,
    sandbox,
    base: sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com",
  };
}

/** Absolute site URL for gateway callbacks. Prefers SITE_URL, falls back to the request host. */
export function getSiteUrl(request: Request): string {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return `https://${new URL(request.url).host}`;
}

export type InitPaymentInput = {
  tranId: string;
  total: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  siteUrl: string;
  productNames: string;
};

/** Calls the Initiate Payment API. Returns the GatewayPageURL to redirect the customer to. */
export async function initSslcommerzPayment(
  input: InitPaymentInput,
  creds?: { storeId?: string; storePassword?: string; sandbox?: boolean }
): Promise<string> {
  const cfg = getSslcommerzConfig(creds);
  const params = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    total_amount: String(input.total),
    currency: "BDT",
    tran_id: input.tranId,
    success_url: `${input.siteUrl}/api/payments/success`,
    fail_url: `${input.siteUrl}/api/payments/fail`,
    cancel_url: `${input.siteUrl}/api/payments/cancel`,
    ipn_url: `${input.siteUrl}/api/payments/ipn`,
    cus_name: input.customerName,
    cus_email: input.email,
    cus_add1: input.address,
    cus_city: input.city,
    cus_postcode: input.postcode,
    cus_country: "Bangladesh",
    cus_phone: input.phone,
    // Shipping receiver info is mandatory for the init API — for a
    // storefront order the receiver is the customer themselves.
    ship_name: input.customerName,
    ship_add1: input.address,
    ship_city: input.city,
    ship_postcode: input.postcode,
    ship_country: "Bangladesh",
    shipping_method: "Courier",
    product_name: input.productNames.slice(0, 255) || "DeshiCart order",
    product_category: "Clothing",
    product_profile: "general",
  });

  const res = await fetch(`${cfg.base}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`SSLCommerz init failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data?.status !== "SUCCESS" || !data?.GatewayPageURL) {
    throw new Error(
      typeof data?.failedreason === "string" && data.failedreason
        ? `SSLCommerz init failed: ${data.failedreason}`
        : "SSLCommerz init failed"
    );
  }
  return data.GatewayPageURL as string;
}

export type ValidationResult = {
  valid: boolean;
  tranId: string;
  amount: number;
  currency: string;
  status: string;
  bankTranId: string;
  cardInfo: string;
  riskLevel: number;
  storeAmount: string;
};

/** Server-side Order Validation API — the only trustworthy payment proof. */
export async function validateSslcommerzTransaction(
  valId: string,
  creds?: { storeId?: string; storePassword?: string; sandbox?: boolean }
): Promise<ValidationResult> {
  const cfg = getSslcommerzConfig(creds);
  const url =
    `${cfg.base}/validator/api/validationserverAPI.php` +
    `?val_id=${encodeURIComponent(valId)}` +
    `&store_id=${encodeURIComponent(cfg.storeId)}` +
    `&store_passwd=${encodeURIComponent(cfg.storePassword)}` +
    `&v=1&format=json`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`SSLCommerz validation failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  const status = String(data?.status ?? "");
  const brand = String(data?.card_brand ?? "").trim();
  const cardType = String(data?.card_type ?? "").trim();
  return {
    // Success/redirect callbacks return VALID; server-to-server IPN returns VALIDATED.
    valid: status === "VALID" || status === "VALIDATED",
    tranId: String(data?.tran_id ?? ""),
    amount: Number(data?.amount ?? NaN),
    currency: String(data?.currency ?? ""),
    status,
    bankTranId: String(data?.bank_tran_id ?? ""),
    cardInfo: [brand, cardType].filter(Boolean).join(" · "),
    riskLevel: Number(data?.risk_level ?? 0) === 1 ? 1 : 0,
    storeAmount: String(data?.store_amount ?? ""),
  };
}

export type TransactionQueryElement = {
  status: string;
  valId: string;
  tranId: string;
  amount: number;
  bankTranId: string;
};

/**
 * Transaction Query API — look up all gateway attempts for our tran_id.
 * Used to reconcile orders stuck in `pending` (customer paid but never
 * returned to the site). Returns one element per attempt found.
 */
export async function querySslcommerzTransaction(
  tranId: string
): Promise<TransactionQueryElement[]> {
  const cfg = getSslcommerzConfig();
  const url =
    `${cfg.base}/validator/api/merchantTransIDvalidationAPI.php` +
    `?tran_id=${encodeURIComponent(tranId)}` +
    `&store_id=${encodeURIComponent(cfg.storeId)}` +
    `&store_passwd=${encodeURIComponent(cfg.storePassword)}` +
    `&format=json`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`SSLCommerz query failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data?.APIConnect !== "DONE" || !Array.isArray(data?.element)) {
    return [];
  }
  return data.element.map((el: Record<string, unknown>) => ({
    status: String(el?.status ?? ""),
    valId: String(el?.val_id ?? ""),
    tranId: String(el?.tran_id ?? ""),
    amount: Number(el?.amount ?? NaN),
    bankTranId: String(el?.bank_tran_id ?? ""),
  }));
}
