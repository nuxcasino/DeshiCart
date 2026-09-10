"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const LABELS: Record<string, string> = {
  admin: "Dashboard",
  orders: "Orders",
  returns: "Returns",
  products: "Products",
  new: "New",
  inventory: "Inventory",
  categories: "Categories",
  coupons: "Coupons",
  zones: "Shipping",
  "payment-gateways": "Gateways",
  reviews: "Reviews",
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const trail = parts.map((seg, i) => ({
    label: LABELS[seg] ?? (/^\d+$/.test(seg) ? `#${seg}` : seg),
    href: `/admin/${parts.slice(0, i + 1).join("/")}`,
    last: i === parts.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link
        href="/admin"
        className="shrink-0 font-bold text-ink-soft transition-colors hover:text-clay"
      >
        Dashboard
      </Link>
      {trail
        .filter((t) => t.label !== "Dashboard")
        .map((t) => (
          <Fragment key={t.href}>
            <span className="text-ink-soft/50">/</span>
            {t.last ? (
              <span className="truncate font-bold text-ink">{t.label}</span>
            ) : (
              <Link
                href={t.href}
                className="shrink-0 font-semibold text-ink-soft transition-colors hover:text-clay"
              >
                {t.label}
              </Link>
            )}
          </Fragment>
        ))}
    </nav>
  );
}
