import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/lib/cart-context";
import { LangProvider } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/locale";
import { localeAlternates } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ChatButton from "@/components/ChatButton";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl =
  process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
  "https://deshi-cart.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DeshiCart — Trendy Fashion for Bangladesh",
    template: "%s — DeshiCart",
  },
  ...localeAlternates("/"),
  description:
    "Shop trendy t-shirts, shirts and fashion accessories crafted for young Bangladesh. Free delivery over ৳3,000.",
  openGraph: {
    type: "website",
    siteName: "DeshiCart",
    title: "DeshiCart — Trendy Fashion for Bangladesh",
    description:
      "Trendy tees, sharp shirts and statement accessories — premium fabric, deshi soul.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeshiCart — Trendy Fashion for Bangladesh",
    description:
      "Trendy tees, sharp shirts and statement accessories — premium fabric, deshi soul.",
  },
  themeColor: "#1b1611",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerLocale = (await headers()).get("x-locale");
  const lang: Locale = isLocale(headerLocale) ? headerLocale : "bn";
  return (
    <html lang={lang} className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <CartProvider>
          <LangProvider initialLang={lang}>
            <Header lang={lang} />
            <CartDrawer lang={lang} />
            <main className="min-h-screen">{children}</main>
            <Footer lang={lang} />
            <ChatButton />
          </LangProvider>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
