import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { OrdersPageClient } from "@/components/storefront/OrdersPageClient";
import { Bell, PackageCheck, Truck } from "lucide-react";

export default function OrdersPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Orders"
        title="Order history and fulfillment."
        description="Track paid, processing, delivered, and pending orders from one customer workspace."
      />

      <OrdersPageClient />
      <section className="order-explainer-grid">
        <article>
          <PackageCheck size={22} />
          <strong>Processing</strong>
          <span>Items are reserved, packed, and prepared for courier handoff.</span>
        </article>
        <article>
          <Truck size={22} />
          <strong>Dispatch</strong>
          <span>Accra orders can move to same-day delivery while nationwide orders use courier dispatch.</span>
        </article>
        <article>
          <Bell size={22} />
          <strong>Updates</strong>
          <span>SMS and confirmation events are structured for Arkesel notification workflows.</span>
        </article>
      </section>
    </AppShell>
  );
}
