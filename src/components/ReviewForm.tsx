"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewsClient } from "@/lib/hono";

export default function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await reviewsClient.index.$post({
        json: { productId, author, title, body, rating },
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setAuthor("");
      setTitle("");
      setBody("");
      setOpen(false);
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-ink px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-ink hover:text-cream"
        >
          Write a Review
        </button>
        {status === "done" && (
          <p className="mt-3 text-sm font-semibold text-leaf animate-fade-in">
            ✓ Thanks! Your review is live.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-xl space-y-4 rounded-xl border border-sand bg-white p-6 animate-fade-up"
    >
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Your rating
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              className="text-2xl transition-transform hover:scale-110"
              aria-label={`Rate ${i} stars`}
            >
              <span className={(hover || rating) >= i ? "text-gold" : "text-sand"}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          className="rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
        />
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Review headline"
          className="rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
        />
      </div>
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think of the fit, fabric and quality?"
        rows={4}
        className="w-full rounded-lg border border-sand px-4 py-3 text-sm outline-none transition-colors focus:border-clay"
      />
      {status === "error" && (
        <p className="text-sm font-semibold text-clay">
          Something went wrong. Please try again.
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
        >
          {status === "sending" ? "Posting…" : "Post Review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-5 py-3 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
