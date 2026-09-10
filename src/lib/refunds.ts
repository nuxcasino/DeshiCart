// Server-only SSLCommerz Refund API helpers.
// Docs: Initiate Refund + Query Refund Status (validator/api/merchantTransIDvalidationAPI.php).
// Note: live use requires your server IP whitelisted with SSLCommerz.

import { getSslcommerzConfig } from "./sslcommerz";

export type RefundInitResult = {
  ok: boolean;
  status: string;
  refundRefId: string;
  errorReason: string;
};

export async function initiateSslcommerzRefund(input: {
  bankTranId: string;
  refundTransId: string;
  amount: number;
  remarks: string;
}): Promise<RefundInitResult> {
  const cfg = getSslcommerzConfig();
  const url =
    `${cfg.base}/validator/api/merchantTransIDvalidationAPI.php` +
    `?bank_tran_id=${encodeURIComponent(input.bankTranId)}` +
    `&refund_trans_id=${encodeURIComponent(input.refundTransId)}` +
    `&refund_amount=${encodeURIComponent(String(input.amount))}` +
    `&refund_remarks=${encodeURIComponent(input.remarks)}` +
    `&store_id=${encodeURIComponent(cfg.storeId)}` +
    `&store_passwd=${encodeURIComponent(cfg.storePassword)}` +
    `&format=json`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Refund request failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  const status = String(data?.status ?? "");
  return {
    ok: data?.APIConnect === "DONE" && (status === "success" || status === "processing"),
    status,
    refundRefId: String(data?.refund_ref_id ?? ""),
    errorReason: String(data?.errorReason ?? ""),
  };
}

export type RefundQueryResult = {
  found: boolean;
  status: string;
  refundedOn: string;
};

/** status: refunded | processing | cancelled (empty when unknown). */
export async function querySslcommerzRefund(
  refundRefId: string
): Promise<RefundQueryResult> {
  const cfg = getSslcommerzConfig();
  const url =
    `${cfg.base}/validator/api/merchantTransIDvalidationAPI.php` +
    `?refund_ref_id=${encodeURIComponent(refundRefId)}` +
    `&store_id=${encodeURIComponent(cfg.storeId)}` +
    `&store_passwd=${encodeURIComponent(cfg.storePassword)}` +
    `&format=json`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Refund query failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data?.APIConnect !== "DONE") return { found: false, status: "", refundedOn: "" };
  return {
    found: true,
    status: String(data?.status ?? ""),
    refundedOn: String(data?.refunded_on ?? ""),
  };
}
