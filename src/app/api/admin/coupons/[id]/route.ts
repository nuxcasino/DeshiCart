import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
  }
  try {
    const data = await request.json();
    const values: Record<string, unknown> = {};
    if (data.type === "flat" || data.type === "percent") values.type = data.type;
    if (data.value !== undefined)
      values.value = Math.max(1, Math.floor(Number(data.value) || 0));
    if (data.minSubtotal !== undefined)
      values.minSubtotal = Math.max(0, Math.floor(Number(data.minSubtotal) || 0));
    if (data.maxUses !== undefined) {
      const n = Number(data.maxUses);
      values.maxUses =
        data.maxUses === null || data.maxUses === ""
          ? null
          : Number.isFinite(n) && n > 0
            ? Math.floor(n)
            : null;
    }
    if (data.active !== undefined) values.active = Boolean(data.active);
    if (data.expiresAt !== undefined) {
      const d = String(data.expiresAt).trim();
      values.expiresAt = d ? new Date(d) : null;
    }
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const [updated] = await db
      .update(coupons)
      .set(values)
      .where(eq(coupons.id, couponId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }
    return NextResponse.json({ coupon: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
  }
  const deleted = await db
    .delete(coupons)
    .where(eq(coupons.id, couponId))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
