import { NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getSessionUserFromRequest } from "@/lib/auth";

async function ownedAddress(request: Request, id: number) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return { user: null, row: null };
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  return { user, row: row ?? null };
}

/** Set an address as default. Body: { "isDefault": true } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, row } = await ownedAddress(request, Number(id));
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!row) return NextResponse.json({ error: "Address not found." }, { status: 404 });
  try {
    const data = await request.json();
    if (data.isDefault === true) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, user.id));
      const [updated] = await db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, row.id))
        .returning();
      return NextResponse.json({ address: updated });
    }
    return NextResponse.json({ address: row });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, row } = await ownedAddress(request, Number(id));
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!row) return NextResponse.json({ error: "Address not found." }, { status: 404 });

  await db.delete(addresses).where(eq(addresses.id, row.id));
  if (row.isDefault) {
    // Promote the oldest remaining address to default.
    const [next] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(asc(addresses.id));
    if (next) {
      await db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, next.id));
    }
  }
  return NextResponse.json({ ok: true });
}
