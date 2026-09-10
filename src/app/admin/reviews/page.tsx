import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { desc } from "drizzle-orm";
import ReviewModeration from "@/components/ReviewModeration";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const [rows, prods] = await Promise.all([
    db.select().from(reviews).orderBy(desc(reviews.id)).limit(100),
    db.select().from(products),
  ]);
  const productNames = Object.fromEntries(prods.map((p) => [p.id, p.name]));

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Reviews ({rows.length} latest)
      </h2>
      <ReviewModeration initial={rows} productNames={productNames} />
    </div>
  );
}
