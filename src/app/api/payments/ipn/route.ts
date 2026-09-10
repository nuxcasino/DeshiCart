import { NextResponse } from "next/server";
import { settleOrderPayment } from "@/lib/payments";

/**
 * Server-to-server Instant Payment Notification from SSLCommerz.
 * Same verification as the success callback; idempotent, no redirect.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const tranId = String(form.get("tran_id") ?? "");
    const valId = form.get("val_id") ? String(form.get("val_id")) : null;
    if (!tranId) return NextResponse.json({ ok: false }, { status: 400 });
    const result = await settleOrderPayment(tranId, valId);
    return NextResponse.json({ ok: result.outcome === "paid" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
