"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof body?.error === "string" ? body.error : "Login failed. Please try again."
        );
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
        Welcome back
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Log in
      </h1>
      <form
        onSubmit={submit}
        className="mt-8 space-y-4 rounded-xl border border-sand bg-white p-6 sm:p-8"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Email
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
            Password
          </span>
          <input
            required
            type="password"
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
          {sending ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-ink-soft">
          New to DeshiCart?{" "}
          <Link href="/signup" className="font-bold text-clay hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
