import { NextResponse } from "next/server";
import { previewCoupon } from "@/lib/coupons";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

/** Preview a coupon against the current subtotal (no usage consumed). */
export async function POST(request: Request) {
  if (isRateLimited(`coupon:${clientIp(request)}`, 20, 60_000)) {
    return rateLimitedResponse();
  }
  try {
    const data = await request.json();
    const code = String(data.code ?? "");
    const subtotal = Math.max(0, Math.floor(Number(data.subtotal) || 0));
    const result = await previewCoupon(code, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      code: result.coupon.code,
      discount: result.discount,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
