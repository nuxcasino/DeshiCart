// Server-only SSLCommerz helpers (never import from client components).
// Docs: https://developer.sslcommerz.com (Initiate Payment + Order Validation APIs)

export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  sandbox: boolean;
  base: string;
};

export function getSslcommerzConfig(): SslcommerzConfig {
  const storeId = process.env.SSLCZ_STORE_ID;
  const storePassword = process.env.SSLCZ_STORE_PASSWORD;
  if (!storeId || !storePassword) {
    throw new Error(
      "SSLCZ_STORE_ID / SSLCZ_STORE_PASSWORD are required for online payments"
    );
  }
  const sandbox = (process.env.SSLCZ_SANDBOX ?? "true").toLowerCase() !== "false";
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
  input: InitPaymentInput
): Promise<string> {
  const cfg = getSslcommerzConfig();
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
};

/** Server-side Order Validation API — the only trustworthy payment proof. */
export async function validateSslcommerzTransaction(
  valId: string
): Promise<ValidationResult> {
  const cfg = getSslcommerzConfig();
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
  return {
    // Success/redirect callbacks return VALID; server-to-server IPN returns VALIDATED.
    valid: status === "VALID" || status === "VALIDATED",
    tranId: String(data?.tran_id ?? ""),
    amount: Number(data?.amount ?? NaN),
    currency: String(data?.currency ?? ""),
    status,
  };
}
