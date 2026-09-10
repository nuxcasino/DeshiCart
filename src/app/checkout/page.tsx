"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatBDT, shippingFor } from "@/lib/format";

const cities = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cumilla",
  "Other",
];

const paymentMethods = [
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay when your order arrives",
    icon: "💵",
  },
  {
    id: "bkash",
    label: "bKash",
    desc: "Pay securely with bKash",
    icon: "📱",
  },
  {
    id: "card",
    label: "Card",
    desc: "Visa, Mastercard & Amex",
    icon: "💳",
  },
];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    city: "Dhaka",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            quantity: i.quantity,
          })),
        }),
      });
      if (!res.ok) throw new Error("failed");
      const { orderId } = await res.json();
      clearCart();
      router.push(`/order/${orderId}`);
    } catch {
      setStatus("error");
    }
  };

  if (items.length === 0 && status !== "sending") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-3xl">
          🛍️
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">
          Your bag is empty
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Add a few pieces before heading to checkout.
        </p>
        <Link
          href="/shop"
          className="mt-6 rounded-full bg-ink px-8 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-clay"
        >
          Browse the Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
          Almost there
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Checkout
        </h1>
      </div>

      <form onSubmit={submit} className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          {/* Contact */}
          <section className="rounded-xl border border-sand bg-white p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold">
              1 · Contact Details
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Full name *
                </span>
                <input
                  required
                  value={form.customerName}
                  onChange={set("customerName")}
                  placeholder="Ayesha Rahman"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Phone *
                </span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Email *
                </span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@email.com"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-xl border border-sand bg-white p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold">
              2 · Delivery Address
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Street address *
                </span>
                <input
                  required
                  value={form.address}
                  onChange={set("address")}
                  placeholder="House 12, Road 5, Dhanmondi"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  City / District *
                </span>
                <select
                  value={form.city}
                  onChange={set("city")}
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Delivery notes
                </span>
                <input
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="e.g. call before delivery"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-sand bg-white p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold">3 · Payment</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    paymentMethod === pm.id
                      ? "border-ink bg-ink text-cream shadow-md"
                      : "border-sand bg-white hover:border-clay"
                  }`}
                >
                  <span className="text-xl">{pm.icon}</span>
                  <p className="mt-2 text-sm font-bold">{pm.label}</p>
                  <p
                    className={`mt-0.5 text-xs ${
                      paymentMethod === pm.id ? "text-cream/70" : "text-ink-soft"
                    }`}
                  >
                    {pm.desc}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              This is a demo storefront — no real payment will be processed.
            </p>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-2">
          <div className="sticky top-28 rounded-xl border border-sand bg-white p-6 sm:p-7">
            <h2 className="font-display text-lg font-semibold">Order Summary</h2>
            <ul className="scroll-slim mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={`${item.productId}-${item.size}`} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute -right-0 -top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-ink text-[10px] font-bold text-cream">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold leading-snug">{item.name}</p>
                      {item.size && item.size !== "One Size" && (
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          Size {item.size}
                        </p>
                      )}
                    </div>
                    <p className="text-xs font-bold">
                      {formatBDT(item.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-sand pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivery</span>
                <span className="font-semibold">
                  {shipping === 0 ? (
                    <span className="text-leaf">Free</span>
                  ) : (
                    formatBDT(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-sand pt-3 text-base">
                <span className="font-bold">Total</span>
                <span className="font-display text-xl font-semibold">
                  {formatBDT(total)}
                </span>
              </div>
            </div>
            {status === "error" && (
              <p className="mt-4 text-sm font-semibold text-clay">
                Something went wrong placing your order. Please try again.
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-6 w-full rounded-full bg-ink py-4 text-sm font-bold text-cream transition-all hover:bg-clay hover:shadow-[0_8px_24px_rgba(179,84,30,0.35)] disabled:opacity-60"
            >
              {status === "sending" ? "Placing order…" : `Place Order · ${formatBDT(total)}`}
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-soft">
              🔒 Secure checkout · 7-day easy exchange
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
