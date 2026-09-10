import { NextResponse } from "next/server";
import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const zoneId = Number(id);
  if (!Number.isInteger(zoneId)) {
    return NextResponse.json({ error: "Invalid zone id." }, { status: 400 });
  }
  const deleted = await db
    .delete(shippingZones)
    .where(eq(shippingZones.id, zoneId))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Zone not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
