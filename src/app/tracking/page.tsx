import { MapPin, PackageCheck, Truck } from "lucide-react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { orders, trackingEvents } from "@/lib/store/account";

export default function TrackingPage() {
  const order = orders[0];

  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Tracking"
        title={order.id}
        description={order.items}
        className="tracking-hero"
        aside={
          <div className="profile-card">
          <Truck size={28} />
          <strong>{order.status}</strong>
          <span>ETA {order.eta}</span>
          </div>
        }
      />

      <section className="tracking-grid">
        <article className="dashboard-panel">
          <h2>Delivery timeline</h2>
          <div className="timeline">
            {trackingEvents.map((event) => (
              <div className={event.state} key={event.title}>
                <span />
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  <small>{event.time}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-panel">
          <h2>Delivery details</h2>
          <div className="detail-list">
            <span>
              <MapPin size={17} /> East Legon, Accra
            </span>
            <span>
              <PackageCheck size={17} /> Package scanned and assigned
            </span>
            <span>
              <Truck size={17} /> Courier dispatch active
            </span>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
