"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/hono";
import { useLang } from "@/lib/i18n";
import { isLocale, lp } from "@/lib/locale";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLang();
  const { lang: raw } = useParams();
  const lang = isLocale(typeof raw === "string" ? raw : null) ? (raw as "bn" | "en") : "bn";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await authClient.signup.$post({ json: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body?.error ?? "Signup failed. Please try again.");
        return;
      }
      router.push(lp(lang, "/account"));
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
        {t("auth.join")}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {t("auth.createTitle")}
      </h1>
      <form
        onSubmit={submit}
        className="mt-8 space-y-4 rounded-xl border border-sand bg-white p-6 sm:p-8"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.fullName")}
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ayesha Rahman"
            className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.email")}
          </span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@email.com"
            className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.phone")}
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="01XXXXXXXXX"
            className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t("auth.passwordMin")}
          </span>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
          />
        </label>
        {error && <p className="text-sm font-semibold text-clay">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-full bg-ink py-3.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
        >
          {sending ? t("auth.creating") : t("auth.createTitle")}
        </button>
        <p className="text-center text-sm text-ink-soft">
          {t("auth.haveAccount")}{" "}
          <Link href={lp(lang, "/login")} className="font-bold text-clay hover:underline">
            {t("auth.loginLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
