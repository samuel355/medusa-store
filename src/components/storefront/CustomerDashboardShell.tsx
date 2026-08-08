"use client";

import { Heart, Home, LogOut, MapPin, PackageCheck, RotateCcw, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", icon: Home, href: "/customers" },
  { label: "Orders", icon: PackageCheck, href: "/customers/orders" },
  { label: "Wishlist", icon: Heart, href: "/customers/wishlist" },
  { label: "Addresses", icon: MapPin, href: "/customers/addresses" },
  { label: "Returns", icon: RotateCcw, href: "/customers/returns" },
  { label: "Preferences", icon: Settings, href: "/customers/preferences" },
];

// Sidebar lives at the layout level (not inside the data-fetching client
// component) so it's always present - including while account data is
// still loading or the visitor isn't signed in - instead of disappearing
// along with whatever early-return the content happens to hit.
export function CustomerDashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <section className="account-dashboard-shell">
      <aside className="account-sidebar" aria-label="Customer dashboard navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <a className={active ? "active" : ""} href={item.href} key={item.href}>
              <Icon size={17} />
              {item.label}
            </a>
          );
        })}
        <form action="/api/auth/logout" method="post" className="account-sidebar-logout-form">
          <button type="submit" className="account-sidebar-logout">
            <LogOut size={17} />
            Log out
          </button>
        </form>
      </aside>
      <div className="account-dashboard-main">{children}</div>
    </section>
  );
}
