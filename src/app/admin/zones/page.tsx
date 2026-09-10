import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { asc } from "drizzle-orm";
import ZoneManager from "@/components/ZoneManager";

export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const rows = await db.select().from(shippingZones).orderBy(asc(shippingZones.city));
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Shipping zones ({rows.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        District-based delivery fees. Cities without a zone use the flat ৳80 rate
        (free over ৳3,000).
      </p>
      <div className="mt-4">
        <ZoneManager initial={rows} />
      </div>
    </div>
  );
}
