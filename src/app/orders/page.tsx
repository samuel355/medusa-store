import { CreditCard, PackageCheck, Truck } from "lucide-react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { orders } from "@/lib/store/account";

export default function OrdersPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Orders"
        title="Order history and fulfillment."
        description="Track paid, processing, delivered, and pending orders from one customer workspace."
      />

      <section className="orders-table">
        {orders.map((order) => (
          <article key={order.id}>
            <div>
              <strong>{order.id}</strong>
              <span>{order.date}</span>
            </div>
            <div>
              <PackageCheck size={18} />
              <span>{order.items}</span>
            </div>
            <div>
              <Truck size={18} />
              <span>{order.status}</span>
            </div>
            <div>
              <CreditCard size={18} />
              <span>{order.payment}</span>
            </div>
            <b>{order.total}</b>
            <a href={`/tracking?order=${order.id}`}>Track</a>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
