import { db } from "@/db";
import { districts, divisions, shippingRules, shippingZones, upazilas } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { FREE_SHIPPING_THRESHOLD, shippingFor } from "./format";
import { ensureLocations, ensureShippingZones } from "./seed";

export async function getDivisions() {
  await ensureLocations();
  return db
    .select()
    .from(divisions)
    .where(eq(divisions.active, true))
    .orderBy(asc(divisions.nameEn));
}

export async function getDistricts(divisionId: string) {
  await ensureLocations();
  return db
    .select()
    .from(districts)
    .where(and(eq(districts.divisionId, divisionId), eq(districts.active, true)))
    .orderBy(asc(districts.nameEn));
}

export async function getUpazilas(districtId: string) {
  await ensureLocations();
  return db
    .select()
    .from(upazilas)
    .where(and(eq(upazilas.districtId, districtId), eq(upazilas.active, true)))
    .orderBy(asc(upazilas.nameEn));
}

export type ShippingQuoteInput = {
  city: string;
  divisionId?: string | null;
  districtId?: string | null;
  upazilaId?: string | null;
  subtotal: number;
};

/**
 * Location shipping resolution (§16): most-specific active rule wins —
 * upazila → district → division → legacy city zone → flat fallback.
 * Free-shipping thresholds apply at every level.
 */
export async function quoteShipping(input: ShippingQuoteInput): Promise<number> {
  const { city, subtotal } = input;
  if (subtotal === 0) return 0;
  await ensureShippingZones();
  await ensureLocations();

  const refs: Array<{ scope: string; refId: string }> = [];
  if (input.upazilaId) refs.push({ scope: "upazila", refId: input.upazilaId });
  if (input.districtId) refs.push({ scope: "district", refId: input.districtId });
  if (input.divisionId) refs.push({ scope: "division", refId: input.divisionId });

  for (const { scope, refId } of refs) {
    const [rule] = await db
      .select()
      .from(shippingRules)
      .where(
        and(
          eq(shippingRules.scope, scope),
          eq(shippingRules.refId, refId),
          eq(shippingRules.active, true)
        )
      );
    if (rule) {
      const threshold = rule.freeOver ?? FREE_SHIPPING_THRESHOLD;
      return subtotal >= threshold ? 0 : rule.fee;
    }
  }

  // Legacy city-zone layer (backward compatible).
  const [zone] = await db
    .select()
    .from(shippingZones)
    .where(and(eq(shippingZones.city, city), eq(shippingZones.active, true)));
  if (zone) {
    const threshold = zone.freeOver ?? FREE_SHIPPING_THRESHOLD;
    return subtotal >= threshold ? 0 : zone.fee;
  }
  return shippingFor(subtotal);
}
