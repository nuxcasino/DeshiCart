import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LangProvider } from "@/lib/i18n";
import { isLocale, LOCALES } from "@/lib/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ChatButton from "@/components/ChatButton";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Storefront shell: public header/nav, cart drawer, footer, chat.
// Independent from the backoffice shell in src/app/admin/layout.tsx.
export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) notFound();
  return (
    <LangProvider initialLang={raw}>
      <Header lang={raw} />
      <CartDrawer lang={raw} />
      <main className="min-h-screen">{children}</main>
      <Footer lang={raw} />
      <ChatButton />
    </LangProvider>
  );
}
