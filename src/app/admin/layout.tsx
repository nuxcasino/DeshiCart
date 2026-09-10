import Link from "next/link";
import type { ReactNode } from "react";
import {
  CreditCard,
  LayoutDashboard,
  Package,
  Percent,
  MessagesSquare,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";
import AdminBreadcrumbs from "@/components/AdminBreadcrumbs";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/coupons", label: "Coupons", icon: Percent },
  { href: "/admin/zones", label: "Shipping", icon: Truck },
  { href: "/admin/payment-gateways", label: "Gateways", icon: CreditCard },
  { href: "/admin/reviews", label: "Reviews", icon: MessagesSquare },
];

// Backoffice shell: sidebar + topbar + breadcrumbs. Fully independent from
// the storefront shell in src/app/[lang]/layout.tsx — no shared chrome.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-sand bg-ink text-cream lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <Link href="/admin" className="px-2 font-display text-2xl font-semibold tracking-tight">
            Deshi<span className="text-gold">Cart</span>
            <span className="ml-2 rounded-full bg-cream/10 px-2 py-0.5 align-middle text-[10px] font-sans font-bold uppercase tracking-widest text-cream/70">
              Admin
            </span>
          </Link>
          <nav className="mt-8 flex-1 space-y-1">
            {links.map((l) => (
              <AdminNavLink key={l.href} href={l.href} label={l.label} Icon={l.icon} />
            ))}
          </nav>
          <div className="border-t border-cream/10 px-2 pt-4 text-xs text-cream/60">
            <p className="font-bold text-cream">{admin.name}</p>
            <div className="mt-2 flex items-center gap-3">
              <Link href="/bn" className="inline-flex items-center gap-1 transition-colors hover:text-gold">
                <Settings2 size={13} /> View store
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-sand bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <AdminBreadcrumbs />
            <LogoutButton />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
            {links.map((l) => (
              <AdminNavLink key={l.href} href={l.href} label={l.label} Icon={l.icon} compact />
            ))}
          </nav>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  Icon,
  compact = false,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        "text-cream/70 hover:bg-cream/10 hover:text-cream",
        compact && "shrink-0 border border-sand bg-white text-ink-soft hover:border-clay hover:text-clay"
      )}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </Link>
  );
}
