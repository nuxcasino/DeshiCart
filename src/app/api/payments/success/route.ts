import { NextResponse } from "next/server";
import { settleOrderPayment } from "@/lib/payments";
import { getSiteUrl } from "@/lib/sslcommerz";

/** Customer returns here after paying. Verifies server-side, then shows the order. */
export async function POST(request: Request) {
  const siteUrl = getSiteUrl(request);
  try {
    const form = await request.formData();
    const tranId = String(form.get("tran_id") ?? "");
    const valId = form.get("val_id") ? String(form.get("val_id")) : null;
    if (!tranId) {
      return NextResponse.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
    }
    const result = await settleOrderPayment(tranId, valId);
    if (result.outcome === "paid") {
      return NextResponse.redirect(`${siteUrl}/order/${result.orderId}`, 303);
    }
    return NextResponse.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
  } catch {
    return NextResponse.redirect(`${siteUrl}/checkout?error=payment-failed`, 303);
  }
}
