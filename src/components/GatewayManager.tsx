"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminGatewaysClient } from "@/lib/hono";

export type AdminGateway = {
  id: number;
  key: string;
  displayName: string;
  enabled: boolean;
  sandbox: boolean;
  currency: string;
  minAmount: number | null;
  maxAmount: number | null;
  extraFee: number;
  priority: number;
  maintenance: boolean;
  hasCredentials: boolean;
  fields: Array<{ name: string; label: string; secret: boolean; help?: string }>;
  description: string;
};

type Drafts = Record<string, Record<string, string>>;
type ConfigEdits = Record<string, Record<string, string | number | boolean>>;

export default function GatewayManager({ initial }: { initial: AdminGateway[] }) {
  const router = useRouter();
  const [items, setItems] = useState<AdminGateway[]>(initial);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [config, setConfig] = useState<ConfigEdits>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setDraft = (key: string, field: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));

  const setCfg = (key: string, field: string, value: string | number | boolean) =>
    setConfig((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));

  const merged = (g: AdminGateway): Record<string, string | number | boolean> => ({
    displayName: g.displayName,
    enabled: g.enabled,
    sandbox: g.sandbox,
    currency: g.currency,
    minAmount: g.minAmount ?? "",
    maxAmount: g.maxAmount ?? "",
    extraFee: g.extraFee,
    priority: g.priority,
    maintenance: g.maintenance,
    ...(config[g.key] ?? {}),
  });

  const save = async (g: AdminGateway) => {
    setBusy(true);
    setMessage((prev) => ({ ...prev, [g.key]: "" }));
    try {
      const m = merged(g);
      const res = await adminGatewaysClient[":key"].$patch({
        param: { key: g.key },
        json: {
          displayName: String(m.displayName),
          enabled: Boolean(m.enabled),
          sandbox: Boolean(m.sandbox),
          currency: String(m.currency),
          minAmount: m.minAmount === "" || m.minAmount === null ? null : Number(m.minAmount),
          maxAmount: m.maxAmount === "" || m.maxAmount === null ? null : Number(m.maxAmount),
          extraFee: Number(m.extraFee) || 0,
          priority: Number(m.priority) || 0,
          maintenance: Boolean(m.maintenance),
          credentials: drafts[g.key] ?? {},
        },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        hasCredentials?: boolean;
      };
      if (!res.ok) {
        setMessage((prev) => ({ ...prev, [g.key]: body?.error ?? "Save failed." }));
        return;
      }
      setItems((prev) =>
        prev.map((x) =>
          x.key === g.key
            ? {
                ...x,
                displayName: String(m.displayName),
                enabled: Boolean(m.enabled),
                sandbox: Boolean(m.sandbox),
                currency: String(m.currency).toUpperCase(),
                minAmount: m.minAmount === "" ? null : (Number(m.minAmount) as number | null),
                maxAmount: m.maxAmount === "" ? null : (Number(m.maxAmount) as number | null),
                extraFee: Number(m.extraFee) || 0,
                priority: Number(m.priority) || 0,
                maintenance: Boolean(m.maintenance),
                hasCredentials: body.hasCredentials ?? x.hasCredentials,
              }
            : x
        )
      );
      setDrafts((prev) => ({ ...prev, [g.key]: {} }));
      setMessage((prev) => ({ ...prev, [g.key]: "Saved ✓" }));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const test = async (g: AdminGateway) => {
    setBusy(true);
    setMessage((prev) => ({ ...prev, [g.key]: "Testing…" }));
    try {
      const res = await adminGatewaysClient[":key"].test.$post({
        param: { key: g.key },
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage((prev) => ({
        ...prev,
        [g.key]: res.ok ? `✓ ${body?.message ?? "OK"}` : `✗ ${body?.message ?? "Failed"}`,
      }));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-sand px-3 py-2 text-sm outline-none transition-colors focus:border-clay";

  return (
    <div className="space-y-4">
      {items.map((g) => {
        const m = merged(g);
        const d = drafts[g.key] ?? {};
        return (
          <section key={g.key} className="rounded-xl border border-sand bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {g.displayName}{" "}
                  <span className="font-mono text-xs font-normal text-ink-soft">({g.key})</span>
                </h3>
                <p className="text-xs text-ink-soft">{g.description}</p>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(m.enabled)}
                    onChange={(e) => setCfg(g.key, "enabled", e.target.checked)}
                    className="h-4 w-4 accent-[#b3541e]"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(m.sandbox)}
                    onChange={(e) => setCfg(g.key, "sandbox", e.target.checked)}
                    className="h-4 w-4 accent-[#b3541e]"
                  />
                  Sandbox
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(m.maintenance)}
                    onChange={(e) => setCfg(g.key, "maintenance", e.target.checked)}
                    className="h-4 w-4 accent-[#b3541e]"
                  />
                  Maintenance
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Display name</span>
                <input value={String(m.displayName)} onChange={(e) => setCfg(g.key, "displayName", e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Currency</span>
                <input value={String(m.currency)} onChange={(e) => setCfg(g.key, "currency", e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Extra fee (BDT)</span>
                <input type="number" min={0} value={String(m.extraFee)} onChange={(e) => setCfg(g.key, "extraFee", e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Min amount</span>
                <input type="number" min={0} value={m.minAmount === null ? "" : String(m.minAmount)} onChange={(e) => setCfg(g.key, "minAmount", e.target.value)} placeholder="No min" className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Max amount</span>
                <input type="number" min={0} value={m.maxAmount === null ? "" : String(m.maxAmount)} onChange={(e) => setCfg(g.key, "maxAmount", e.target.value)} placeholder="No max" className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Priority</span>
                <input type="number" min={0} value={String(m.priority)} onChange={(e) => setCfg(g.key, "priority", e.target.value)} className={input} />
              </label>
            </div>

            {g.fields.length > 0 && (
              <div className="mt-4 rounded-lg bg-sand/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Credentials {g.hasCredentials ? "(stored, encrypted — leave blank to keep)" : "(not set)"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {g.fields.map((f) => (
                    <label key={f.name} className="block">
                      <span className="mb-1 block text-xs font-semibold text-ink-soft">{f.label}</span>
                      <input
                        type={f.secret ? "password" : "text"}
                        value={d[f.name] ?? ""}
                        onChange={(e) => setDraft(g.key, f.name, e.target.value)}
                        placeholder={g.hasCredentials ? "•••••• (unchanged)" : ""}
                        autoComplete="off"
                        className={`${input} bg-white`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {message[g.key] && (
              <p className="mt-3 text-sm font-semibold text-ink-soft">{message[g.key]}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => save(g)}
                disabled={busy}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
              >
                Save {g.displayName}
              </button>
              <button
                onClick={() => test(g)}
                disabled={busy}
                className="rounded-full border border-sand bg-white px-6 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
              >
                Test connection
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
