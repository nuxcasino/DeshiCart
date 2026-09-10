"use client";

import { useState } from "react";
import { contactClient } from "@/lib/hono";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await contactClient.index.$post({ json: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body?.error ?? "Could not send. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Could not send. Please try again.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-leaf/30 bg-leaf/10 p-8 text-center">
        <p className="font-display text-2xl font-semibold">Message sent ✓</p>
        <p className="mt-2 text-sm text-ink-soft">
          Thanks for reaching out — we reply within one working day.
        </p>
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay";

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-sand bg-white p-6 sm:grid-cols-2 sm:p-8">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Name *</span>
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={input} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Email *</span>
        <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Subject *</span>
        <input required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Order #DC-00042 — wrong size" className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Message *</span>
        <textarea required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} className={input} />
      </label>
      {error && <p className="text-sm font-semibold text-clay sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-ink px-8 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
