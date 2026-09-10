import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  hashPassword,
  isValidEmail,
  sessionCookieHeader,
  toSafeUser,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const name = String(data.name ?? "").trim().slice(0, 80);
    const email = String(data.email ?? "").trim().toLowerCase().slice(0, 160);
    const phone = String(data.phone ?? "").trim().slice(0, 20);
    const password = String(data.password ?? "");

    if (!name || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide your name and a valid email." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    const [user] = await db
      .insert(users)
      .values({ name, email, phone, passwordHash: await hashPassword(password) })
      .returning();
    const token = await createSession(user.id);

    const res = NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
