import { db } from "@/db";
import { districts, divisions, shippingRules, shippingZones, upazilas } from "@/db/schema";
import { asc } from "drizzle-orm";
import ZoneManager from "@/components/ZoneManager";
import ShippingRuleManager from "@/components/ShippingRuleManager";

export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const [rows, rules, divs, districtsRows, upazilasRows] = await Promise.all([
    db.select().from(shippingZones).orderBy(asc(shippingZones.city)),
    db.select().from(shippingRules).orderBy(asc(shippingRules.scope), asc(shippingRules.refId)),
    db.select().from(divisions).orderBy(asc(divisions.nameEn)),
    db.select().from(districts).orderBy(asc(districts.nameEn)),
    db.select().from(upazilas).orderBy(asc(upazilas.nameEn)),
  ]);
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Shipping ({rows.length} city zones · {rules.length} location rules)
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Most-specific active rule wins: upazila → district → division → city
        zone → flat ৳80 (free over ৳3,000).
      </p>

      <h3 className="mt-8 font-display text-xl font-semibold tracking-tight">
        Location rules
      </h3>
      <div className="mt-3">
        <ShippingRuleManager
          initial={rules}
          divisions={divs}
          districts={districtsRows}
          upazilas={upazilasRows}
        />
      </div>

      <h3 className="mt-10 font-display text-xl font-semibold tracking-tight">
        Legacy city zones
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Fallback layer kept for backward compatibility.
      </p>
      <div className="mt-3">
        <ZoneManager initial={rows} />
      </div>
    </div>
  );
}
