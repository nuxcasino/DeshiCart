import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/zones", label: "Shipping" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay">
            Store admin · {admin.name}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Dashboard
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-sand bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-soft transition-colors hover:border-clay hover:text-clay"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
