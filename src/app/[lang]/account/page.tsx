import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, orders, returnRequests } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { getSessionUser, toSafeUser } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import AddressManager from "@/components/AddressManager";
import LogoutButton from "@/components/LogoutButton";
import ReturnRequestButton from "@/components/ReturnRequestButton";
import { users } from "@/db/schema";
import { isLocale, lp } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "bn";
  const session = await getSessionUser();
  if (!session) redirect(lp(lang, "/login"));

  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user) redirect(lp(lang, "/login"));

  const [myOrders, myAddresses, myReturns] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.id)),
    db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(asc(addresses.id)),
    db.select().from(returnRequests).where(eq(returnRequests.userId, user.id)).orderBy(desc(returnRequests.id)),
  ]);
  const openReturnOrderIds = new Set(
    myReturns.filter((r) => r.status === "requested" || r.status === "approved").map((r) => r.orderId)
  );

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
            <Link href={lp(lang, "/wishlist")} className="font-bold text-clay hover:underline">
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
              href={lp(lang, "/shop")}
              className="mt-4 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
            {myOrders.map((o) => (
              <li key={o.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={lp(lang, `/order/${o.id}`)}
                    className="transition-colors hover:text-clay"
                  >
                    <span className="text-sm font-bold">
                      Order #DC-{String(o.id).padStart(5, "0")}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {new Date(o.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {o.status}
                      {o.paymentStatus === "paid" ? " · Paid" : ""}
                      {o.refundStatus !== "none" ? ` · Refund ${o.refundStatus}` : ""}
                    </span>
                  </Link>
                  <span className="font-display text-lg font-semibold">
                    {formatBDT(o.total)}
                  </span>
                </div>
                {o.status === "delivered" && (
                  <div className="mt-2">
                    <ReturnRequestButton
                      orderId={o.id}
                      hasOpenRequest={openReturnOrderIds.has(o.id)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {myReturns.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Return requests
          </h2>
          <ul className="mt-4 divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
            {myReturns.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                <div>
                  <p className="font-bold">
                    Order #DC-{String(r.orderId).padStart(5, "0")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">{r.reason}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
