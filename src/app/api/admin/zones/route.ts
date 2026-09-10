import { NextResponse } from "next/server";
import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getAdminFromRequest } from "@/lib/admin";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const rows = await db.select().from(shippingZones).orderBy(asc(shippingZones.city));
  return NextResponse.json({ zones: rows });
}

/** Create or update a city's zone (upsert by city name). */
export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const data = await request.json();
    const city = String(data.city ?? "").trim().slice(0, 60);
    const fee = Math.max(0, Math.floor(Number(data.fee ?? NaN)));
    const freeRaw = Number(data.freeOver);
    const freeOver =
      data.freeOver === null || data.freeOver === "" || data.freeOver === undefined
        ? null
        : Number.isFinite(freeRaw) && freeRaw >= 0
          ? Math.floor(freeRaw)
          : null;
    if (!city || !Number.isFinite(fee)) {
      return NextResponse.json(
        { error: "City and fee are required." },
        { status: 400 }
      );
    }
    const [row] = await db
      .insert(shippingZones)
      .values({ city, fee, freeOver, active: data.active !== false })
      .onConflictDoUpdate({
        target: shippingZones.city,
        set: {
          fee,
          freeOver,
          active: data.active !== false,
        },
      })
      .returning();
    return NextResponse.json({ zone: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
