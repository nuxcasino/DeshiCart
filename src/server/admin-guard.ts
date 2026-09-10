import { getAdminFromRequest } from "@/lib/admin";
import type { AdminUser } from "@/lib/admin";
import { AuthorizationError } from "./errors";

/** Server-side admin gate for Hono routers (§6). Throws 403 when not admin. */
export async function requireAdminRequest(request: Request): Promise<AdminUser> {
  const admin = await getAdminFromRequest(request);
  if (!admin) throw new AuthorizationError("Forbidden.");
  return admin;
}
