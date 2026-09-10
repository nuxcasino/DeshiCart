import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { and, eq, gt, lt } from "drizzle-orm";

const scrypt = promisify(_scrypt);

export const SESSION_COOKIE = "deshicart_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SafeUser = Pick<User, "id" | "name" | "email" | "phone">;

export function toSafeUser(user: User): SafeUser {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

/** scrypt password hash (`salt:derivedHex`). No extra dependency needed. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, "hex");
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row + returns the raw token to set as a cookie. */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function getUserByToken(
  token: string | undefined | null
): Promise<SafeUser | null> {
  if (!token) return null;
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date())
      )
    );
  return row ? toSafeUser(row.user) : null;
}

/** For server components / layouts (reads the cookie jar). */
export async function getSessionUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  return getUserByToken(jar.get(SESSION_COOKIE)?.value);
}

/** For route handlers (reads the request cookies). */
export async function getSessionUserFromRequest(
  request: Request
): Promise<SafeUser | null> {
  const header = request.headers.get("cookie") ?? "";
  const token = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return getUserByToken(token ? decodeURIComponent(token) : null);
}

export async function destroySession(token: string | undefined | null) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Removes expired sessions. Called opportunistically on login/signup. */
export async function purgeExpiredSessions(): Promise<void> {
  try {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  } catch {
    // hygiene only — never fail auth over it
  }
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
