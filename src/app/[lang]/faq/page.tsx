import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo";
import { JsonLd, faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  ...localeAlternates("/faq"),
  title: "FAQ",
  description: "Answers about delivery, payments, sizing, exchanges and returns at DeshiCart.",
};

const faqs: Array<[string, string]> = [
  ["How long does delivery take?", "2–4 days nationwide. Dhaka orders are usually fastest (inside-Dhaka fee ৳60); outside Dhaka ৳100–130. Orders over ৳3,000 ship free."],
  ["What payment methods do you accept?", "Cash on Delivery, plus online payment via SSLCommerz — bKash, Nagad, Rocket, cards and netbanking. Online payments are verified server-side before your order is confirmed."],
  ["How do I track my order?", "Log in and open My Account → Order history, or keep your confirmation link (/order/[id]). You'll also get SMS updates when your order ships."],
  ["What if an item is out of stock?", "The product page shows live stock and disables ordering at zero. If your size sells out mid-checkout, we'll tell you exactly what's left before you pay."],
  ["Do you offer exchanges?", "Yes — 7-day easy exchange on unworn items with tags. Start from My Account on delivered orders, and our courier partner will contact you for pickup."],
  ["How do refunds work?", "Online payments refund to your original channel (5–7 working days via the gateway). COD returns are settled in cash on pickup. Track status under My Account → Return requests."],
  ["Do you have discount codes?", "We run coupon campaigns — enter your code at checkout. Codes can have minimum order values, usage limits and expiry dates."],
  ["How do I contact support?", "Use the contact page, email hello@deshicart.com.bd, or call +880 1711-000000 (Sat–Thu, 10am–8pm)."],
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={faqJsonLd(faqs.map(([q, a]) => ({ q, a })))} />
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">Help center</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Frequently asked questions
      </h1>
      <div className="mt-10 space-y-4">
        {faqs.map(([q, a]) => (
          <details key={q} className="group rounded-xl border border-sand bg-white p-5">
            <summary className="cursor-pointer list-none font-display text-lg font-semibold">
              <span className="mr-2 inline-block text-clay transition-transform group-open:rotate-45">+</span>
              {q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
