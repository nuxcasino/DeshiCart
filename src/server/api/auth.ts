import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { addresses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  SESSION_COOKIE,
  clearSessionCookieHeader,
  createSession,
  destroySession,
  getSessionUserFromRequest,
  hashPassword,
  isValidEmail,
  purgeExpiredSessions,
  sessionCookieHeader,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import { validationHook } from "../validate";
import {
  clientIp,
  isRateLimited,
  rateLimitedResponse,
} from "@/lib/ratelimit";

const signupBody = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().max(160).refine(isValidEmail, "Invalid email."),
  phone: z.string().trim().max(20).default(""),
  password: z.string().min(8).max(128),
});

const loginBody = z.object({
  email: z.string().trim().max(160),
  password: z.string().min(1).max(128),
});

function cookieToken(c: { req: { raw: Request } }): string | null {
  const header = c.req.raw.headers.get("cookie") ?? "";
  const found = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return found ? decodeURIComponent(found) : null;
}

const app = new Hono()
  .post("/signup", zValidator("json", signupBody, validationHook), async (c) => {
    if (isRateLimited(`signup:${clientIp(c.req.raw)}`, 10, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");
    const email = input.email.toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing) {
      return c.json(
        { error: "An account with this email already exists. Please log in." },
        409
      );
    }

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
      })
      .returning();
    const token = await createSession(user.id);
    await purgeExpiredSessions();

    c.header("Set-Cookie", sessionCookieHeader(token));
    return c.json({ user: toSafeUser(user) }, 201);
  })
  .post("/login", zValidator("json", loginBody, validationHook), async (c) => {
    if (isRateLimited(`login:${clientIp(c.req.raw)}`, 10, 60_000)) {
      return rateLimitedResponse();
    }
    const input = c.req.valid("json");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()));
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return c.json({ error: "Incorrect email or password." }, 401);
    }

    const token = await createSession(user.id);
    await purgeExpiredSessions();

    c.header("Set-Cookie", sessionCookieHeader(token));
    return c.json({ user: toSafeUser(user) });
  })
  .post("/logout", async (c) => {
    await destroySession(cookieToken(c));
    c.header("Set-Cookie", clearSessionCookieHeader());
    return c.json({ ok: true });
  })
  .get("/me", async (c) => {
    const session = await getSessionUserFromRequest(c.req.raw);
    if (!session) return c.json({ user: null });
    const [user] = await db.select().from(users).where(eq(users.id, session.id));
    if (!user) return c.json({ user: null });
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id));
    const def = rows.find((a) => a.isDefault) ?? rows[0] ?? null;
    return c.json({ user: toSafeUser(user), defaultAddress: def });
  });

export type AuthRoute = typeof app;
export default app;
