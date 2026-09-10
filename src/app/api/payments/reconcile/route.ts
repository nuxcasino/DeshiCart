import { NextResponse } from "next/server";
import { reconcileOrderPayment } from "@/lib/payments";

/**
 * Reconciles a `pending` online order against the gateway (Transaction Query
 * API) — for payments that succeeded at the bank but never returned to the
 * site. Terminal orders are never modified.
 *
 * Intended for admin tooling / support lookups (and a future expiry cron).
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const tranId = String(data?.tranId ?? "").trim();
    if (!tranId) {
      return NextResponse.json({ error: "tranId is required" }, { status: 400 });
    }
    const result = await reconcileOrderPayment(tranId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
