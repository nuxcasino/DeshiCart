import Link from "next/link";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo";
import { isLocale, lp } from "@/lib/locale";

export const metadata: Metadata = {
  ...localeAlternates("/size-guide"),
  title: "Size Guide",
  description: "DeshiCart size charts for t-shirts, shirts and women's wear, plus how to measure yourself.",
};

const tables: Array<{
  title: string;
  note: string;
  rows: Array<[string, string, string, string]>;
}> = [
  {
    title: "T-Shirts (unisex, inches)",
    note: "Relaxed DeshiCart fit. Between sizes? Size down for a regular fit, up for oversized.",
    rows: [
      ["S", "38", "27", "8"],
      ["M", "40", "28", "8.25"],
      ["L", "42", "29", "8.5"],
      ["XL", "44", "30", "8.75"],
      ["XXL", "46", "31", "9"],
    ],
  },
  {
    title: "Casual Shirts (inches)",
    note: "Measure around the fullest part of your chest, keeping the tape level.",
    rows: [
      ["S", "39", "28", "23"],
      ["M", "41", "29", "23.5"],
      ["L", "43", "30", "24"],
      ["XL", "45", "31", "24.5"],
      ["XXL", "47", "32", "25"],
    ],
  },
  {
    title: "Women's Tops (inches)",
    note: "Our women's cuts run true to size with a slightly tailored waist.",
    rows: [
      ["S", "36", "26", "7.5"],
      ["M", "38", "27", "7.75"],
      ["L", "40", "28", "8"],
      ["XL", "42", "29", "8.25"],
    ],
  },
];

export default async function SizeGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang = isLocale(raw) ? raw : "bn";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">Fit guide</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Size guide
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        All measurements in inches, taken on the garment laid flat (chest = pit
        to pit × 2). Every batch is pre-shrunk and bio-washed, so what you
        measure is what you keep.
      </p>

      {tables.map((t) => (
        <section key={t.title} className="mt-8 overflow-hidden rounded-xl border border-sand bg-white">
          <div className="border-b border-sand bg-sand/40 px-5 py-4">
            <h2 className="font-display text-lg font-semibold">{t.title}</h2>
            <p className="mt-1 text-xs text-ink-soft">{t.note}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3 text-right">Chest</th>
                <th className="px-5 py-3 text-right">Length</th>
                <th className="px-5 py-3 text-right">Sleeve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {t.rows.map(([size, chest, length, sleeve]) => (
                <tr key={size}>
                  <td className="px-5 py-3 font-bold">{size}</td>
                  <td className="px-5 py-3 text-right">{chest}</td>
                  <td className="px-5 py-3 text-right">{length}</td>
                  <td className="px-5 py-3 text-right">{sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <div className="mt-8 rounded-xl border border-sand bg-white p-6 text-sm leading-relaxed text-ink-soft">
        <h2 className="font-display text-lg font-semibold text-ink">How to measure</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li><strong className="text-ink">Chest:</strong> around the fullest part, tape level across your back.</li>
          <li><strong className="text-ink">Length:</strong> from the highest shoulder point straight down.</li>
          <li><strong className="text-ink">Sleeve:</strong> from shoulder seam to cuff.</li>
        </ol>
        <p className="mt-3">
          Still unsure? Wrong size is covered by our{" "}
          <Link href={lp(lang, "/returns")} className="font-bold text-clay hover:underline">
            7-day exchange
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
