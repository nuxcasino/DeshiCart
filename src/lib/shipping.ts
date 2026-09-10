import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { FREE_SHIPPING_THRESHOLD, shippingFor } from "./format";
import { ensureShippingZones } from "./seed";

/** District-based fee; falls back to the flat rule when no zone matches. */
export async function shippingForCity(
  city: string,
  subtotal: number
): Promise<number> {
  if (subtotal === 0) return 0;
  await ensureShippingZones();
  const [zone] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.city, city), eq(shippingZones.active, true)));
  if (!zone) return shippingFor(subtotal);
  const threshold = zone.freeOver ?? FREE_SHIPPING_THRESHOLD;
  return subtotal >= threshold ? 0 : zone.fee;
}
