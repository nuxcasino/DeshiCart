import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id));
  return NextResponse.json({ coupons: rows });
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const data = await request.json();
    const code = String(data.code ?? "").trim().toUpperCase().slice(0, 40);
    const type = data.type === "percent" ? "percent" : "flat";
    const value = Math.max(1, Math.floor(Number(data.value) || 0));
    const minSubtotal = Math.max(0, Math.floor(Number(data.minSubtotal) || 0));
    const maxRaw = Number(data.maxUses);
    const maxUses =
      data.maxUses === null || data.maxUses === "" || data.maxUses === undefined
        ? null
        : Number.isFinite(maxRaw) && maxRaw > 0
          ? Math.floor(maxRaw)
          : null;
    const expiresRaw = String(data.expiresAt ?? "").trim();
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    if (!code || !value) {
      return NextResponse.json(
        { error: "Code and value are required." },
        { status: 400 }
      );
    }
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }
    const [row] = await db
      .insert(coupons)
      .values({
        code,
        type,
        value,
        minSubtotal,
        maxUses,
        active: data.active !== false,
        expiresAt,
      })
      .returning();
    return NextResponse.json({ coupon: row }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
      return NextResponse.json({ error: "Code already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
