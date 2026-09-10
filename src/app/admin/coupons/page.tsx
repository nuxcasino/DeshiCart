import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import CouponManager from "@/components/CouponManager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id));
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Coupons ({rows.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Codes apply at checkout; usage is consumed atomically on order placement.
      </p>
      <div className="mt-4">
        <CouponManager initial={rows} />
      </div>
    </div>
  );
}
