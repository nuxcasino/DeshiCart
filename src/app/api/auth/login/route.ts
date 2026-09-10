import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  sessionCookieHeader,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ user: toSafeUser(user) });
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
