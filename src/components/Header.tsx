"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { authClient } from "@/lib/hono";
import { LangToggle, useLang, type DictKey } from "@/lib/i18n";

const nav: Array<{ href: string; labelKey: DictKey }> = [
  { href: "/", labelKey: "nav.home" },
  { href: "/shop", labelKey: "nav.shop" },
  { href: "/shop?category=t-shirts", labelKey: "nav.tshirts" },
  { href: "/shop?category=shirts", labelKey: "nav.shirts" },
  { href: "/shop?category=women", labelKey: "nav.women" },
  { href: "/shop?category=accessories", labelKey: "nav.accessories" },
];

export default function Header() {
  const { count, openCart } = useCart();
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Intentional external-system sync: close the mobile menu on navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Session lookup in a fetch callback (not a direct effect-body setState).
    (async () => {
      try {
        const r = await authClient.me.$get();
        const d = (await r.json()) as { user?: { name?: string } | null };
        setAccountName(d?.user?.name ?? null);
      } catch {
        setAccountName(null);
      }
    })();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-ink text-cream text-center text-[11px] sm:text-xs tracking-[0.18em] uppercase py-2 px-4">
        {t("header.announce")}
      </div>
      <div
        className={`transition-all duration-300 border-b ${
          scrolled
            ? "bg-cream/90 backdrop-blur-md border-sand shadow-[0_1px_20px_rgba(27,22,17,0.06)]"
            : "bg-cream border-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <button
              className="lg:hidden -ml-2 p-2 text-ink"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t("header.menu")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                ) : (
                  <path d="M3 6h18M3 12h18M3 18h12" strokeLinecap="round" />
                )}
              </svg>
            </button>

            <Link href="/" className="flex items-baseline gap-1.5 select-none">
              <span className="font-display text-2xl font-semibold tracking-tight">
                Deshi<span className="text-clay">Cart</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] text-ink-soft/70">
                Dhaka
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-7">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[13px] font-medium tracking-wide text-ink-soft hover:text-clay transition-colors"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <LangToggle />
              <Link
                href="/shop"
                className="hidden sm:flex p-2 text-ink hover:text-clay transition-colors"
                aria-label={t("header.search")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </Link>
              <Link
                href="/wishlist"
                className="hidden sm:flex p-2 text-ink hover:text-clay transition-colors"
                aria-label="Wishlist"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 20.5C7 16.5 3 13.2 3 9.3 3 6.4 5.2 4.5 7.7 4.5c1.7 0 3.3.9 4.3 2.4 1-1.5 2.6-2.4 4.3-2.4 2.5 0 4.7 1.9 4.7 4.8 0 3.9-4 7.2-9 11.2Z" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href={accountName ? "/account" : "/login"}
                className="flex items-center gap-1.5 p-2 text-ink hover:text-clay transition-colors"
                aria-label={accountName ? t("header.account") : t("header.login")}
              >                {accountName ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clay font-display text-xs font-semibold text-white">
                    {accountName.trim()[0]?.toUpperCase() ?? "•"}
                  </span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
                  </svg>
                )}
              </Link>
              <button
                onClick={openCart}
                className="relative p-2 text-ink hover:text-clay transition-colors"
                aria-label="Open cart"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M6 7h12l1.2 12.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 7Z" />
                  <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white animate-fade-in">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
            <nav className="lg:hidden border-t border-sand bg-cream px-4 pb-4 pt-2 animate-fade-in">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-ink-soft hover:text-clay transition-colors border-b border-sand/60 last:border-0"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
        )}
      </div>
    </header>
  );
}
