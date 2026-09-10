"use client";

import Image from "next/image";
import { useState } from "react";

export default function Gallery({
  images,
  name,
  badge,
}: {
  images: string[];
  name: string;
  badge: string | null;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-sand">
        <div className="relative aspect-[3/4]">
          <Image
            key={active}
            src={images[active]}
            alt={`${name} — view ${active + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover animate-fade-in"
          />
        </div>
        {badge && (
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white ${
              badge === "New" ? "bg-leaf" : badge === "Limited" ? "bg-ink" : "bg-clay"
            }`}
          >
            {badge}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-md transition-all hover:bg-white"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-md transition-all hover:bg-white"
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-lg transition-all ${
                active === i
                  ? "ring-2 ring-clay ring-offset-2 ring-offset-cream"
                  : "opacity-70 hover:opacity-100"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <div className="relative aspect-[3/4] bg-sand">
                <Image src={img} alt="" fill sizes="20vw" className="object-cover" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
