import { Heart, MapPin, PackageCheck, Phone, UserRound } from "lucide-react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { customerProfile, customerStats, orders } from "@/lib/store/account";

export default function CustomersPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title={customerProfile.name}
        description="Profile, rewards, addresses, saved items, and order activity for the signed-in shopper."
        aside={
          <div className="profile-card">
          <UserRound size={28} />
          <strong>{customerProfile.tier}</strong>
          <span>{customerProfile.joined}</span>
          </div>
        }
      />

      <section className="metric-grid">
        {customerStats.map((stat) => (
          <article key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <h2>Customer details</h2>
          <div className="detail-list">
            <span>
              <Phone size={17} /> {customerProfile.phone}
            </span>
            <span>
              <MapPin size={17} /> {customerProfile.location}
            </span>
            <span>
              <Heart size={17} /> 24 saved products
            </span>
          </div>
        </article>

        <article className="dashboard-panel">
          <h2>Recent activity</h2>
          <div className="order-list compact">
            {orders.slice(0, 2).map((order) => (
              <a href={`/tracking?order=${order.id}`} key={order.id}>
                <PackageCheck size={18} />
                <div>
                  <strong>{order.id}</strong>
                  <span>{order.status}</span>
                </div>
                <b>{order.total}</b>
              </a>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
