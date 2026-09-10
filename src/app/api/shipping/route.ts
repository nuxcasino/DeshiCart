import { NextResponse } from "next/server";
import { shippingForCity } from "@/lib/shipping";

/** Delivery fee quote for a city + subtotal. Public, cheap, cacheable client-side. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const subtotal = Math.max(0, Math.floor(Number(searchParams.get("subtotal")) || 0));
  const shipping = await shippingForCity(city, subtotal);
  return NextResponse.json({ shipping });
}
