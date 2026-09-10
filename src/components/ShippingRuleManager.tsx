"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { District, Division, ShippingRule, Upazila } from "@/db/schema";
import { adminShippingRulesClient } from "@/lib/hono";

export default function ShippingRuleManager({
  initial,
  divisions,
  districts,
  upazilas,
}: {
  initial: ShippingRule[];
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ShippingRule[]>(initial);
  const [scope, setScope] = useState<"division" | "district" | "upazila">("division");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [refId, setRefId] = useState("");
  const [fee, setFee] = useState("");
  const [freeOver, setFreeOver] = useState("3000");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const nameOf = (scope: string, refId: string): string => {
    if (scope === "division") return divisions.find((d) => d.id === refId)?.nameEn ?? refId;
    if (scope === "district") {
      const d = districts.find((x) => x.id === refId);
      return d ? `${d.nameEn} (${divisions.find((v) => v.id === d.divisionId)?.nameEn ?? ""})` : refId;
    }
    const u = upazilas.find((x) => x.id === refId);
    return u ? `${u.nameEn} (${districts.find((d) => d.id === u.districtId)?.nameEn ?? ""})` : refId;
  };

  const districtsOf = (divId: string) => districts.filter((d) => d.divisionId === divId);
  const upazilasOf = (disId: string) => upazilas.filter((u) => u.districtId === disId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refId) {
      setError("Select a location.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await adminShippingRulesClient.index.$post({
        json: { scope, refId, fee: Number(fee), freeOver: freeOver || null, active: true },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        rule?: ShippingRule;
      };
      if (!res.ok || !body.rule) {
        setError(body?.error ?? "Could not save rule.");
        return;
      }
      const saved = body.rule;
      setItems((prev) => {
        const next = prev.filter((r) => !(r.scope === saved.scope && r.refId === saved.refId));
        return [...next, saved].sort((a, b) =>
          a.scope === b.scope ? a.refId.localeCompare(b.refId) : a.scope.localeCompare(b.scope)
        );
      });
      setRefId("");
      setFee("");
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const remove = async (r: ShippingRule) => {
    const res = await adminShippingRulesClient[":id"].$delete({
      param: { id: String(r.id) },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      router.refresh();
    }
  };

  const input =
    "w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay";

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm font-semibold text-clay">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand p-6 text-sm text-ink-soft">
          No location rules — checkout uses legacy city zones, then the flat rate.
          Add a division default first, then district/upazila overrides.
        </p>
      ) : (
        <ul className="divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-bold">
                  <span className="mr-2 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                    {r.scope}
                  </span>
                  {nameOf(r.scope, r.refId)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  ৳{r.fee} fee{r.freeOver !== null ? ` · free over ৳${r.freeOver}` : " · never free"}
                </p>
              </div>
              <button onClick={() => remove(r)} className="text-xs font-bold text-ink-soft hover:text-clay hover:underline">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={save} className="mt-6 grid gap-3 rounded-xl border border-dashed border-sand p-4 sm:grid-cols-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft sm:col-span-3">
          Add / update rule (same scope + location overwrites)
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Level</span>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as typeof scope);
              setRefId("");
              setDivisionId("");
              setDistrictId("");
            }}
            className={input}
          >
            <option value="division">Division default</option>
            <option value="district">District override</option>
            <option value="upazila">Upazila override</option>
          </select>
        </label>
        {(scope === "district" || scope === "upazila") && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Division</span>
            <select
              value={divisionId}
              onChange={(e) => {
                setDivisionId(e.target.value);
                setDistrictId("");
                setRefId("");
              }}
              className={input}
            >
              <option value="">Select…</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
              ))}
            </select>
          </label>
        )}
        {scope === "upazila" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">District</span>
            <select
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setRefId("");
              }}
              className={input}
              disabled={!divisionId}
            >
              <option value="">Select…</option>
              {districtsOf(divisionId).map((d) => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Location *</span>
          <select
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            className={input}
            disabled={scope !== "division" && (scope === "district" ? !divisionId : !districtId)}
          >
            <option value="">Select…</option>
            {scope === "division" &&
              divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
              ))}
            {scope === "district" &&
              districtsOf(divisionId).map((d) => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
              ))}
            {scope === "upazila" &&
              upazilasOf(districtId).map((u) => (
                <option key={u.id} value={u.id}>{u.nameEn}</option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Fee (BDT) *</span>
          <input required type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Free over (blank = never)</span>
          <input type="number" min={0} value={freeOver} onChange={(e) => setFreeOver(e.target.value)} className={input} />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60 sm:col-span-3 sm:justify-self-start"
        >
          {sending ? "Saving…" : "Save rule"}
        </button>
      </form>
    </div>
  );
}
