"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { formatBDT, FREE_SHIPPING_THRESHOLD, shippingFor } from "@/lib/format";

export default function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, updateQuantity, removeItem } =
    useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCart]);

  if (!isOpen) return null;

  const shipping = shippingFor(subtotal);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-fade-in"
        onClick={closeCart}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-sand px-5 py-4">
          <h2 className="font-display text-xl font-semibold">
            Your Bag{" "}
            <span className="text-sm font-sans font-medium text-ink-soft">
              ({items.reduce((a, i) => a + i.quantity, 0)})
            </span>
          </h2>
          <button
            onClick={closeCart}
            className="p-2 text-ink-soft hover:text-ink transition-colors"
            aria-label="Close cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-3xl">
              🛍️
            </div>
            <p className="font-display text-lg">Your bag is empty</p>
            <p className="text-sm text-ink-soft">
              Fresh drops are waiting. Find something you love.
            </p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream hover:bg-clay transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-sand px-5 py-3">
              {remaining > 0 ? (
                <p className="text-xs text-ink-soft">
                  Add <span className="font-semibold text-clay">{formatBDT(remaining)}</span> more for{" "}
                  <span className="font-semibold">free delivery</span>
                </p>
              ) : (
                <p className="text-xs font-semibold text-leaf">
                  🎉 You&apos;ve unlocked free delivery!
                </p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-clay transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-5">
                {items.map((item) => (
                  <li key={`${item.productId}-${item.size}`} className="flex gap-4">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-sand"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-semibold leading-snug hover:text-clay transition-colors"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.productId, item.size)}
                          className="text-ink-soft/60 hover:text-clay transition-colors"
                          aria-label={`Remove ${item.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      {item.size && item.size !== "One Size" && (
                        <p className="mt-0.5 text-xs text-ink-soft">Size: {item.size}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-sand">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.size, item.quantity - 1)
                            }
                            className="px-2.5 py-1 text-sm text-ink-soft hover:text-clay"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.size, item.quantity + 1)
                            }
                            className="px-2.5 py-1 text-sm text-ink-soft hover:text-clay"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold">
                          {formatBDT(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-sand px-5 py-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-semibold">{formatBDT(subtotal)}</span>
              </div>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-ink-soft">Delivery</span>
                <span className="font-semibold">
                  {shipping === 0 ? "Free" : formatBDT(shipping)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full rounded-full bg-ink py-3.5 text-center text-sm font-bold text-cream transition-all hover:bg-clay hover:shadow-lg"
              >
                Checkout · {formatBDT(subtotal + shipping)}
              </Link>
              <button
                onClick={closeCart}
                className="mt-2 w-full py-2 text-center text-xs font-medium text-ink-soft underline-offset-4 hover:underline"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
