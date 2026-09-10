import type {
  ProviderInitArgs,
  ProviderInitResult,
  PaymentProvider,
} from "./providers";
import { initSslcommerzPayment } from "@/lib/sslcommerz";

/** Adapter registry — a missing key means "configured but not implemented". */
export const ADAPTERS: Record<string, PaymentProvider> = {
  sslcommerz: {
    key: "sslcommerz",
    initPayment: (args, opts) => initSslcommerzProviderPayment(args, opts),
  },
};

/** Cash on Delivery: no redirect — the order flow completes directly. */
export async function initCodPayment(): Promise<ProviderInitResult> {
  return { kind: "direct" };
}

/** SSLCommerz hosted checkout. Credentials resolve DB → env fallback. */
export async function initSslcommerzProviderPayment(
  args: ProviderInitArgs,
  opts?: { storeId?: string; storePassword?: string; sandbox?: boolean }
): Promise<ProviderInitResult> {
  const gatewayUrl = await initSslcommerzPayment(
    {
      tranId: args.order.transactionId!,
      total: args.order.total,
      customerName: args.customer.name,
      email: args.customer.email,
      phone: args.customer.phone,
      address: args.customer.address,
      city: args.customer.city,
      postcode: args.customer.postcode,
      siteUrl: args.siteUrl,
      productNames: args.productNames,
    },
    opts
  );
  return { kind: "redirect", gatewayUrl };
}
