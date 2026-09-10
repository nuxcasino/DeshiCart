import { NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(asc(addresses.id));
  return NextResponse.json({ addresses: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const data = await request.json();
    const label = String(data.label ?? "Home").trim().slice(0, 30) || "Home";
    const name = String(data.name ?? "").trim().slice(0, 80);
    const phone = String(data.phone ?? "").trim().slice(0, 20);
    const address = String(data.address ?? "").trim().slice(0, 200);
    const city = String(data.city ?? "").trim().slice(0, 60);
    const postcode = String(data.postcode ?? "").trim().slice(0, 20);
    const isDefault = Boolean(data.isDefault);

    if (!name || !phone || !address || !city) {
      return NextResponse.json(
        { error: "Name, phone, address and city are required." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, user.id));
    const makeDefault = isDefault || existing.length === 0;
    if (makeDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, user.id));
    }

    const [row] = await db
      .insert(addresses)
      .values({
        userId: user.id,
        label,
        name,
        phone,
        address,
        city,
        postcode,
        isDefault: makeDefault,
      })
      .returning();
    return NextResponse.json({ address: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
