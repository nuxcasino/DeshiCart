import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/lib/cart-context";
import { isLocale, type Locale } from "@/lib/locale";
import { localeAlternates } from "@/lib/seo";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
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

// Root shell only: fonts, global providers, analytics, structured data.
// Storefront chrome lives in src/app/[lang]/layout.tsx,
// backoffice chrome in src/app/admin/layout.tsx — never mixed.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerLocale = (await headers()).get("x-locale");
  const lang: Locale = isLocale(headerLocale) ? headerLocale : "bn";
  return (
    <html lang={lang} className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
