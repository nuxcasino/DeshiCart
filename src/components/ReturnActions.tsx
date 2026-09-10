"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Order, ReturnRequest } from "@/db/schema";

export default function ReturnActions({
  request,
  order,
}: {
  request: ReturnRequest;
  order: Order;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const act = async (action: "approve" | "reject" | "check") => {
    if (action !== "check" && !confirm(`Confirm: ${action} this return?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/returns/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof body?.error === "string" ? body.error : "Action failed.");
        return;
      }
      setMessage(
        body.manual
          ? "Marked refunded (cash handled offline) ✓"
          : `Done: ${body.status ?? body.refund ?? action} ✓`
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {request.status === "requested" && (
          <>
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="rounded-full bg-ink px-5 py-2 text-xs font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
            >
              Approve{order.bankTranId ? " & refund" : " (cash refund)"}
            </button>
            <button
              onClick={() => act("reject")}
              disabled={busy}
              className="rounded-full border border-sand bg-white px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
            >
              Reject
            </button>
          </>
        )}
        {request.status === "approved" && order.refundRefId && (
          <button
            onClick={() => act("check")}
            disabled={busy}
            className="rounded-full border border-sand bg-white px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
          >
            Check refund status
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-xs font-semibold text-ink-soft">{message}</p>}
      {order.refundRefId && (
        <p className="mt-2 font-mono text-[11px] text-ink-soft">
          refund_ref: {order.refundRefId} · gateway: {order.refundStatus}
        </p>
      )}
    </div>
  );
}
