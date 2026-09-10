import { NextResponse } from "next/server";
import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUserFromRequest, toSafeUser } from "@/lib/auth";

/** Current session user + default address (for checkout prefill). */
export async function GET(request: Request) {
  const session = await getSessionUserFromRequest(request);
  if (!session) return NextResponse.json({ user: null });
  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user) return NextResponse.json({ user: null });
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id));
  const def = rows.find((a) => a.isDefault) ?? rows[0] ?? null;
  return NextResponse.json({ user: toSafeUser(user), defaultAddress: def });
}
