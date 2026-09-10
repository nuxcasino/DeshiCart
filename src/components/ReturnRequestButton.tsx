"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { returnsClient } from "@/lib/hono";

export default function ReturnRequestButton({
  orderId,
  hasOpenRequest,
}: {
  orderId: number;
  hasOpenRequest: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(hasOpenRequest);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await returnsClient.index.$post({
        json: { orderId, reason: reason.trim() },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(body?.error ?? "Request failed.");
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <span className="text-xs font-bold text-ink-soft">
        Return requested ✓
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold text-clay hover:underline"
      >
        Request return
      </button>
      {open && (
        <form onSubmit={submit} className="mt-2 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for return (e.g. wrong size)"
            rows={2}
            required
            className="w-full rounded-lg border border-sand px-3 py-2 text-xs outline-none focus:border-clay"
          />
          {message && <p className="text-xs font-semibold text-clay">{message}</p>}
          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
          >
            {sending ? "Sending…" : "Submit request"}
          </button>
        </form>
      )}
    </div>
  );
}
