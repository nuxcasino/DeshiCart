"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  authClient,
  couponsClient,
  locationsClient,
  ordersClient,
  paymentsClient,
  shippingClient,
} from "@/lib/hono";
import { useCart } from "@/lib/cart-context";
import { formatBDT, shippingFor } from "@/lib/format";
import type { District, Division, Upazila } from "@/db/schema";

const paymentMethods = [
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay when your order arrives",
    icon: "💵",
  },
  {
    id: "sslcommerz",
    label: "Online Payment",
    desc: "bKash, Nagad, cards & more",
    icon: "🌐",
  },
];

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm text-ink-soft">Loading checkout…</p>
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    divisionId: "",
    districtId: "",
    upazilaId: "",
    postcode: "",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);

  const loadDistricts = async (divisionId: string) => {
    try {
      const r = await locationsClient.divisions[":divisionId"].districts.$get({
        param: { divisionId },
      });
      const d = (await r.json()) as { districts?: District[] };
      setDistricts(d.districts ?? []);
    } catch {
      setDistricts([]);
    }
  };

  const loadUpazilas = async (districtId: string) => {
    try {
      const r = await locationsClient.districts[":districtId"].upazilas.$get({
        param: { districtId },
      });
      const d = (await r.json()) as { upazilas?: Upazila[] };
      setUpazilas(d.upazilas ?? []);
    } catch {
      setUpazilas([]);
    }
  };

  // Prefill from the account (if logged in) without clobbering typed input.
  // Saved city names resolve to division/district/upazila ids for shipping.
  useEffect(() => {
    (async () => {
      try {
        const dr = await locationsClient.divisions.$get();
        const dd = (await dr.json()) as { divisions?: Division[] };
        setDivisions(dd.divisions ?? []);
      } catch {
        // location selects stay disabled; city text still works
      }
      try {
        const r = await authClient.me.$get();
        const d = (await r.json()) as {
          user?: { name?: string; email?: string; phone?: string } | null;
          defaultAddress?: {
            address?: string;
            city?: string;
            postcode?: string;
          } | null;
        };
        if (!d?.user) return;
        const city = d.defaultAddress?.city || "";
        setForm((f) => ({
          ...f,
          customerName: f.customerName || d.user?.name || "",
          email: f.email || d.user?.email || "",
          phone: f.phone || d.user?.phone || "",
          address: f.address || d.defaultAddress?.address || "",
          city: f.address ? f.city : city,
          postcode: f.postcode || d.defaultAddress?.postcode || "",
        }));
        if (city) {
          try {
            const rr = await locationsClient.resolve.$get({ query: { district: city } });
            if (rr.ok) {
              const rd = (await rr.json()) as {
                division?: Division;
                district?: District;
                upazilas?: Upazila[];
              };
              if (rd.division && rd.district) {
                const resolved = await locationsClient.divisions[":divisionId"].districts.$get({
                  param: { divisionId: rd.division.id },
                });
                const rdd = (await resolved.json()) as { districts?: District[] };
                setDistricts(rdd.districts ?? []);
                setUpazilas(rd.upazilas ?? []);
                setForm((f) => ({
                  ...f,
                  divisionId: rd.division!.id,
                  districtId: rd.district!.id,
                  upazilaId: "",
                  city: rd.district!.nameEn,
                }));
              }
            }
          } catch {
            // city text still submits; shipping falls back to city zones
          }
        }
      } catch {
        // not logged in or unreachable — checkout works as guest
      }
    })();
  }, []);

  // Gateway return errors (?error=payment-failed|cancelled) — derived during
  // render so no effect-sync is needed. The bag is kept intact on return.
  const urlError = searchParams.get("error");
  const urlErrorMessage =
    urlError === "payment-failed"
      ? "Online payment failed or could not be verified. Your bag is kept as-is — please try again or choose Cash on Delivery."
      : urlError === "payment-cancelled"
        ? "Online payment was cancelled. Your bag is kept as-is — please try again or choose Cash on Delivery."
        : null;

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [zoneShipping, setZoneShipping] = useState<number | null>(null);

  const discounted = Math.max(0, subtotal - discount);

  // Location-aware delivery fee; falls back through city zones to flat rule.
  // (The previous quote stays visible while the new one loads.)
  useEffect(() => {
    (async () => {
      try {
        const r = await shippingClient.quote.$get({
          query: {
            city: form.city,
            divisionId: form.divisionId,
            districtId: form.districtId,
            upazilaId: form.upazilaId,
            subtotal: String(discounted),
          },
        });
        const d = (await r.json()) as { shipping?: number };
        if (typeof d?.shipping === "number") setZoneShipping(d.shipping);
      } catch {
        // falls back to the flat rule
      }
    })();
  }, [form.city, form.divisionId, form.districtId, form.upazilaId, discounted]);

  const shipping = zoneShipping ?? shippingFor(discounted);
  const total = discounted + shipping;

  const applyCouponCode = async () => {
    if (!couponCode.trim()) return;
    setCouponMsg(null);
    try {
      const res = await couponsClient.validate.$post({
        json: { code: couponCode, subtotal },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        discount?: number;
      };
      if (!res.ok) {
        setCouponMsg(body?.error ?? "Invalid coupon.");
        setDiscount(0);
        setAppliedCode(null);
        return;
      }
      setDiscount(body.discount ?? 0);
      setAppliedCode(body.code ?? couponCode.toUpperCase());
    } catch {
      setCouponMsg("Could not check coupon. Please try again.");
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setDiscount(0);
    setAppliedCode(null);
    setCouponMsg(null);
  };

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setStatus("sending");
    setErrorMessage(null);
    const isOnline = paymentMethod === "sslcommerz";
    try {
      // Typed RPC payloads: request shapes are checked against the Zod
      // schemas; only the response union needs a light cast below.
      const payload = {
        ...form,
        paymentMethod,
          couponCode: appliedCode ?? "",
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            size: i.size,
            quantity: i.quantity,
          })),
      };
      const res = isOnline
        ? await paymentsClient.init.$post({ json: payload })
        : await ordersClient.index.$post({ json: payload });
      if (!res.ok) {
        let message = "Something went wrong placing your order. Please try again.";
        try {
          // Error shapes union across endpoints; only these fields matter here.
          const body = (await res.json()) as {
            error?: string;
            items?: Array<{ name: string; available: number }>;
          };
          if (Array.isArray(body?.items) && body.items.length > 0) {
            message =
              "Some items don't have enough stock: " +
              body.items
                .map(
                  (i: { name: string; available: number }) =>
                    `${i.name} (only ${i.available} left)`
                )
                .join(", ");
          } else if (typeof body?.error === "string") {
            message = body.error;
          }
        } catch {
          // fall back to the generic message
        }
        setErrorMessage(message);
        throw new Error("failed");
      }
      const data = (await res.json()) as {
        orderId?: number;
        gatewayUrl?: string;
        error?: string;
        items?: Array<{ name: string; available: number }>;
      };
      if (isOnline) {
        if (!data.gatewayUrl || !data.orderId) {
          setErrorMessage("Could not start online payment. Please try again.");
          throw new Error("failed");
        }
        // Keep the bag intact until the gateway confirms; the order page
        // clears it once payment succeeds (see ClearCartOnSuccess).
        try {
          window.sessionStorage.setItem(
            "deshicart:pending-order",
            String(data.orderId)
          );
        } catch {
          // session storage may be unavailable
        }
        window.location.href = data.gatewayUrl;
        return;
      }
      clearCart();
      router.push(`/order/${data.orderId}`);
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
                  Division *
                </span>
                <select
                  required
                  value={form.divisionId}
                  onChange={async (e) => {
                    const divisionId = e.target.value;
                    setForm((f) => ({
                      ...f,
                      divisionId,
                      districtId: "",
                      upazilaId: "",
                      city: "",
                    }));
                    setUpazilas([]);
                    if (divisionId) await loadDistricts(divisionId);
                    else setDistricts([]);
                  }}
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                >
                  <option value="">Select division…</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.nameEn}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  District *
                </span>
                <select
                  required
                  value={form.districtId}
                  disabled={!form.divisionId}
                  onChange={async (e) => {
                    const districtId = e.target.value;
                    const district = districts.find((d) => d.id === districtId);
                    setForm((f) => ({
                      ...f,
                      districtId,
                      upazilaId: "",
                      city: district?.nameEn ?? "",
                    }));
                    setUpazilas([]);
                    if (districtId) await loadUpazilas(districtId);
                  }}
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-clay disabled:opacity-50"
                >
                  <option value="">Select district…</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.nameEn}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Upazila / Thana
                </span>
                <select
                  value={form.upazilaId}
                  disabled={!form.districtId}
                  onChange={set("upazilaId")}
                  className="w-full rounded-lg border border-sand bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-clay disabled:opacity-50"
                >
                  <option value="">Select upazila…</option>
                  {upazilas.map((u) => (
                    <option key={u.id} value={u.id}>{u.nameEn}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Postcode
                </span>
                <input
                  value={form.postcode}
                  onChange={set("postcode")}
                  placeholder="1200"
                  inputMode="numeric"
                  className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
                />
              </label>
              <label className="block sm:col-span-2">
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
              Cash on Delivery orders are confirmed instantly. Online payments
              are processed securely via SSLCommerz (bKash, Nagad, cards).
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
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
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
            <div className="mt-5 border-t border-sand pt-4">
              {appliedCode ? (
                <div className="flex items-center justify-between rounded-lg bg-leaf/10 px-3 py-2.5 text-sm">
                  <span className="font-bold text-leaf">✓ {appliedCode} (−{formatBDT(discount)})</span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-bold text-ink-soft hover:text-clay hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="w-full rounded-lg border border-sand px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-clay"
                    />
                    <button
                      type="button"
                      onClick={applyCouponCode}
                      className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-xs font-bold text-cream transition-colors hover:bg-clay"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMsg && (
                    <p className="mt-1.5 text-xs font-semibold text-clay">{couponMsg}</p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 border-t border-sand pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold">{formatBDT(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Discount</span>
                  <span className="font-semibold text-leaf">−{formatBDT(discount)}</span>
                </div>
              )}
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
            {(status === "error" || urlErrorMessage) && (
              <p className="mt-4 text-sm font-semibold text-clay">
                {errorMessage ??
                  urlErrorMessage ??
                  "Something went wrong placing your order. Please try again."}
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
