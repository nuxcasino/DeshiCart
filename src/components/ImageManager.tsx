"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ProductImage } from "@/db/schema";
import { adminImagesClient } from "@/lib/hono";

export default function ImageManager({
  productId,
  initial,
}: {
  productId: number;
  initial: ProductImage[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ProductImage[]>(initial);
  const [alts, setAlts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readError = (body: unknown, fallback: string) =>
    typeof (body as { error?: unknown })?.error === "string"
      ? String((body as { error: string }).error)
      : fallback;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("productId", String(productId));
      files.slice(0, 10).forEach((f) => data.append("files", f));
      const res = await fetch("/api/admin/images", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        images?: ProductImage[];
      };
      if (!res.ok || !body.images) {
        setError(readError(body, "Upload failed."));
        return;
      }
      setItems((prev) => [...prev, ...body.images!]);
      router.refresh();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveAlt = async (img: ProductImage) => {
    const alt = alts[img.id];
    if (alt === undefined) return;
    setBusy(true);
    try {
      const res = await adminImagesClient[":id"].$patch({
        param: { id: String(img.id) },
        json: { alt },
      });
      if (res.ok) {
        setItems((prev) => prev.map((x) => (x.id === img.id ? { ...x, alt } : x)));
        setAlts((prev) => {
          const next = { ...prev };
          delete next[img.id];
          return next;
        });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (img: ProductImage) => {
    setBusy(true);
    try {
      const res = await adminImagesClient[":id"].$patch({
        param: { id: String(img.id) },
        json: { isPrimary: true },
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) => ({ ...x, isPrimary: x.id === img.id }))
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const move = async (img: ProductImage, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.position - b.position || a.id - b.id);
    const idx = sorted.findIndex((x) => x.id === img.id);
    const other = sorted[idx + dir];
    if (!other) return;
    setBusy(true);
    try {
      const [a, b] = await Promise.all([
        adminImagesClient[":id"].$patch({
          param: { id: String(img.id) },
          json: { position: other.position },
        }),
        adminImagesClient[":id"].$patch({
          param: { id: String(other.id) },
          json: { position: img.position },
        }),
      ]);
      if (a.ok && b.ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === img.id
              ? { ...x, position: other.position }
              : x.id === other.id
                ? { ...x, position: img.position }
                : x
          )
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (img: ProductImage) => {
    if (!confirm("Delete this image from the CDN and the product?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminImagesClient[":id"].$delete({
        param: { id: String(img.id) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(readError(body, "Delete failed."));
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== img.id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm font-semibold text-clay">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand p-6 text-sm text-ink-soft">
          No managed images yet — the product shows its legacy image URLs.
          Upload below to move it to the CDN.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...items]
            .sort((a, b) => a.position - b.position || a.id - b.id)
            .map((img) => (
              <li key={img.id} className="rounded-xl border border-sand bg-white p-3">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-sand">
                  <Image src={img.url} alt={img.alt || "Product image"} fill sizes="240px" className="object-cover" />
                  {img.isPrimary && (
                    <span className="absolute left-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Primary
                    </span>
                  )}
                </div>
                <input
                  value={alts[img.id] ?? img.alt}
                  onChange={(e) =>
                    setAlts((prev) => ({ ...prev, [img.id]: e.target.value }))
                  }
                  placeholder="Alt text"
                  className="mt-2 w-full rounded-md border border-sand px-2 py-1.5 text-xs outline-none focus:border-clay"
                />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {alts[img.id] !== undefined && alts[img.id] !== img.alt && (
                    <button onClick={() => saveAlt(img)} disabled={busy} className="text-xs font-bold text-leaf hover:underline disabled:opacity-50">
                      Save alt
                    </button>
                  )}
                  {!img.isPrimary && (
                    <button onClick={() => makePrimary(img)} disabled={busy} className="text-xs font-bold text-clay hover:underline disabled:opacity-50">
                      Set primary
                    </button>
                  )}
                  <button onClick={() => move(img, -1)} disabled={busy} className="text-xs font-bold text-ink-soft hover:text-clay disabled:opacity-50">
                    ←
                  </button>
                  <button onClick={() => move(img, 1)} disabled={busy} className="text-xs font-bold text-ink-soft hover:text-clay disabled:opacity-50">
                    →
                  </button>
                  <button onClick={() => remove(img)} disabled={busy} className="text-xs font-bold text-ink-soft hover:text-clay hover:underline disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={upload}
          disabled={busy}
          className="text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-5 file:py-2.5 file:text-xs file:font-bold file:text-cream hover:file:bg-clay disabled:opacity-60"
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          JPEG / PNG / WebP · max 5 MB each · max 10 per product
          {busy ? " · Uploading…" : ""}
        </p>
      </div>
    </div>
  );
}
