import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  purgeExpiredSessions,
  sessionCookieHeader,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

export async function POST(request: Request) {
  if (isRateLimited(`login:${clientIp(request)}`, 10, 60_000)) {
    return rateLimitedResponse();
  }
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
    await purgeExpiredSessions();
    const res = NextResponse.json({ user: toSafeUser(user) });
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
