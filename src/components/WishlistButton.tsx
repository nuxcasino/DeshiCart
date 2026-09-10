"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WishlistButton({
  productId,
  name,
  initialSaved = false,
}: {
  productId: number;
  name: string;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.saved === "boolean") setSaved(body.saved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all disabled:opacity-60 ${
        saved
          ? "bg-clay text-white"
          : "bg-white text-ink hover:bg-clay hover:text-white"
      }`}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      title={saved ? "Saved to wishlist" : "Save to wishlist"}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20.5C7 16.5 3 13.2 3 9.3 3 6.4 5.2 4.5 7.7 4.5c1.7 0 3.3.9 4.3 2.4 1-1.5 2.6-2.4 4.3-2.4 2.5 0 4.7 1.9 4.7 4.8 0 3.9-4 7.2-9 11.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
