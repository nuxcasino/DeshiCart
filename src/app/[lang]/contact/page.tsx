import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  ...localeAlternates("/contact"),
  title: "Contact Us",
  description: "Contact DeshiCart support — email, phone and contact form.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">Get in touch</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Contact us
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-sand bg-white p-5 text-sm">
          <p className="font-bold">✉️ Email</p>
          <p className="mt-1 text-ink-soft">hello@deshicart.com.bd</p>
        </div>
        <div className="rounded-xl border border-sand bg-white p-5 text-sm">
          <p className="font-bold">📞 Phone</p>
          <p className="mt-1 text-ink-soft">+880 1711-000000 (Sat–Thu, 10am–8pm)</p>
        </div>
      </div>
      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
