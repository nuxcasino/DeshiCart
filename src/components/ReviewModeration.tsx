"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Review } from "@/db/schema";
import { adminReviewsClient } from "@/lib/hono";
import Stars from "./Stars";

export default function ReviewModeration({
  initial,
  productNames,
}: {
  initial: Review[];
  productNames: Record<number, string>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Review[]>(initial);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggleVerified = async (review: Review) => {
    setBusyId(review.id);
    try {
      const res = await adminReviewsClient[":id"].$patch({
        param: { id: String(review.id) },
        json: { verified: !review.verified },
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, verified: !r.verified } : r))
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: Review) => {
    if (!confirm("Delete this review? The product rating will be recalculated.")) return;
    setBusyId(review.id);
    try {
      const res = await adminReviewsClient[":id"].$delete({
        param: { id: String(review.id) },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.id !== review.id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return <p className="mt-4 text-sm text-ink-soft">No reviews yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border border-sand bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold">{r.author}</span>
              <Stars rating={r.rating} size={12} />
              {r.verified && (
                <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf">
                  Verified
                </span>
              )}
            </div>
            <span className="text-xs text-ink-soft">
              {productNames[r.productId] ?? `Product #${r.productId}`} ·{" "}
              {new Date(r.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {r.title && <p className="mt-2 text-sm font-bold">{r.title}</p>}
          <p className="mt-1 text-sm text-ink-soft">{r.body}</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => toggleVerified(r)}
              disabled={busyId === r.id}
              className="text-xs font-bold text-clay hover:underline disabled:opacity-50"
            >
              {r.verified ? "Unverify" : "Mark verified"}
            </button>
            <button
              onClick={() => remove(r)}
              disabled={busyId === r.id}
              className="text-xs font-bold text-ink-soft hover:text-clay hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

