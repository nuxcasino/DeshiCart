import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getSessionUser,
  getSessionUserFromRequest,
  type SafeUser,
} from "./auth";

export type AdminUser = SafeUser & { isAdmin: boolean };

async function withAdminFlag(
  session: SafeUser | null
): Promise<AdminUser | null> {
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user || !user.isAdmin) return null;
  return { ...session, isAdmin: true };
}

/** For admin server components/layouts — redirects non-admins to /login. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await withAdminFlag(await getSessionUser());
  if (!admin) redirect("/bn/login");
  return admin;
}

/** For admin API routes — returns the admin or null (caller sends 403). */
export async function getAdminFromRequest(
  request: Request
): Promise<AdminUser | null> {
  return withAdminFlag(await getSessionUserFromRequest(request));
}
