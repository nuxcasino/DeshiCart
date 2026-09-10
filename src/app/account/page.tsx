import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, orders } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getSessionUser, toSafeUser } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import AddressManager from "@/components/AddressManager";
import LogoutButton from "@/components/LogoutButton";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user) redirect("/login");

  const [myOrders, myAddresses] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.id)),
    db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(asc(addresses.id)),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
            My account
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Hello, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {toSafeUser(user).email}
            {user.phone ? ` · ${user.phone}` : ""} ·{" "}
            <Link href="/wishlist" className="font-bold text-clay hover:underline">
              My wishlist →
            </Link>
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Order history
        </h2>
        {myOrders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-sand p-8 text-center">
            <p className="text-sm text-ink-soft">You haven&apos;t placed any orders yet.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
            {myOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/order/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 transition-colors hover:bg-sand/40"
                >
                  <div>
                    <p className="text-sm font-bold">
                      Order #DC-{String(o.id).padStart(5, "0")}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {new Date(o.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {o.status}
                      {o.paymentStatus === "paid" ? " · Paid" : ""}
                    </p>
                  </div>
                  <span className="font-display text-lg font-semibold">
                    {formatBDT(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Saved addresses
        </h2>
        <div className="mt-4">
          <AddressManager initial={myAddresses} />
        </div>
      </section>
    </div>
  );
}
