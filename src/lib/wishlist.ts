import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "./auth";

/** Product ids the current visitor saved (empty when logged out). */
export async function getWishlistIds(): Promise<Set<number>> {
  const user = await getSessionUser();
  if (!user) return new Set();
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, user.id));
  return new Set(rows.map((r) => r.productId));
}
