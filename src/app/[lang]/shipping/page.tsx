import Link from "next/link";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo";
import { isLocale, lp } from "@/lib/locale";
import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { asc } from "drizzle-orm";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT, formatBDT } from "@/lib/format";

export const metadata: Metadata = {
  ...localeAlternates("/shipping"),
  title: "Shipping & Delivery",
  description: "DeshiCart delivery fees, free-shipping threshold and timelines across Bangladesh.",
};

export const dynamic = "force-dynamic";

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "bn";
  let zones = await db
    .select()
    .from(shippingZones)
    .orderBy(asc(shippingZones.city))
    .catch(() => []);
  zones = zones.filter((z) => z.active);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">Delivery info</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Shipping & delivery
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          We deliver to all 64 districts in <strong className="text-ink">2–4 days</strong>.
          Orders over <strong className="text-ink">{formatBDT(FREE_SHIPPING_THRESHOLD)}</strong> ship{" "}
          <strong className="text-ink">free</strong> — otherwise the district fee below applies.
        </p>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand/50 text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3">District</th>
              <th className="px-5 py-3 text-right">Fee</th>
              <th className="px-5 py-3 text-right">Free over</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {zones.length === 0 ? (
              <tr>
                <td className="px-5 py-4">Nationwide (flat rate)</td>
                <td className="px-5 py-4 text-right font-semibold">{formatBDT(SHIPPING_FLAT)}</td>
                <td className="px-5 py-4 text-right font-semibold">{formatBDT(FREE_SHIPPING_THRESHOLD)}</td>
              </tr>
            ) : (
              zones.map((z) => (
                <tr key={z.id}>
                  <td className="px-5 py-3.5 font-semibold">{z.city}</td>
                  <td className="px-5 py-3.5 text-right">{formatBDT(z.fee)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {z.freeOver !== null ? formatBDT(z.freeOver) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Cash on Delivery is available everywhere. Questions? See the{" "}
        <Link href={lp(lang, "/faq")} className="font-bold text-clay hover:underline">FAQ</Link> or{" "}
        <Link href={lp(lang, "/contact")} className="font-bold text-clay hover:underline">contact us</Link>.
      </p>
    </div>
  );
}
