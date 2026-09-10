import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "DeshiCart 7-day exchange and return policy, refunds and how to request a return.",
};

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">Our promise</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Returns & exchanges
      </h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section className="rounded-xl border border-sand bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">7-day easy exchange</h2>
          <p className="mt-2">
            Unworn items with tags attached can be exchanged within 7 days of delivery —
            wrong size, wrong fit, or simply changed your mind. Final-sale items marked
            at checkout are excluded.
          </p>
        </section>
        <section className="rounded-xl border border-sand bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">How to request</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Log in and open <Link href="/account" className="font-bold text-clay hover:underline">My Account</Link>.</li>
            <li>Find the delivered order and click <strong className="text-ink">Request return</strong> with a reason.</li>
            <li>Our courier partner will contact you for pickup within 24 hours of approval.</li>
          </ol>
        </section>
        <section className="rounded-xl border border-sand bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Refunds</h2>
          <p className="mt-2">
            Online payments refund to the original channel within 5–7 working days of
            approval. Cash on Delivery returns are settled in cash at pickup. Track
            every step under My Account → Return requests, and by SMS/email.
          </p>
        </section>
        <p>
          Need help? <Link href="/contact" className="font-bold text-clay hover:underline">Contact us</Link> or
          check the <Link href="/faq" className="font-bold text-clay hover:underline">FAQ</Link>.
        </p>
      </div>
    </div>
  );
}
