"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2 max-w-sm">
            <p className="font-display text-2xl font-semibold">
              Deshi<span className="text-gold">Cart</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream/60">
              {t("footer.blurb")}
            </p>
            <div className="mt-5 flex gap-3">
              {["facebook", "instagram", "tiktok"].map((s) => (
                <span
                  key={s}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cream/20 text-xs uppercase tracking-wide text-cream/70 transition-colors hover:border-gold hover:text-gold"
                >
                  {s[0]}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream/50">
              {t("footer.shop")}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/75">
              <li><Link href="/shop" className="hover:text-gold transition-colors">{t("footer.all")}</Link></li>
              <li><Link href="/shop?category=t-shirts" className="hover:text-gold transition-colors">T-Shirts</Link></li>
              <li><Link href="/shop?category=shirts" className="hover:text-gold transition-colors">Shirts</Link></li>
              <li><Link href="/shop?category=women" className="hover:text-gold transition-colors">Women</Link></li>
              <li><Link href="/shop?category=accessories" className="hover:text-gold transition-colors">Accessories</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream/50">
              {t("footer.support")}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/75">
              <li><Link href="/faq" className="hover:text-gold transition-colors">{t("footer.faq")}</Link></li>
              <li><Link href="/shipping" className="hover:text-gold transition-colors">{t("footer.shipping")}</Link></li>
              <li><Link href="/returns" className="hover:text-gold transition-colors">{t("footer.returns")}</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition-colors">{t("footer.contact")}</Link></li>
              <li>Delivery in 2–4 days nationwide</li>
              <li>Cash on delivery available</li>
              <li>7-day easy exchange</li>
              <li>hello@deshicart.com.bd</li>
              <li>+880 1711-000000</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-cream/10 pt-6 text-xs text-cream/40 sm:flex-row">
          <p>© {new Date().getFullYear()} DeshiCart. {t("footer.rights")}</p>
          <p>
            {t("footer.developed")}{" "}
            <a
              href="http://fb.me/mdrashedulislam11"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-cream/70 transition-colors hover:text-gold"
            >
              MD RASHEDUL ISLAM
            </a>
          </p>
          <p>bKash · Nagad · Cards · Cash on Delivery</p>
        </div>
      </div>
    </footer>
  );
}
