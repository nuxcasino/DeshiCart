import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import CategoryManager from "@/components/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const cats = await db.select().from(categories).orderBy(asc(categories.id));
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Categories ({cats.length})
      </h2>
      <div className="mt-4">
        <CategoryManager initial={cats} />
      </div>
    </div>
  );
}
