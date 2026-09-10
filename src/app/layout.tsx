import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
