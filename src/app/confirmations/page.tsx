import { BadgeCheck, Bell, PackageCheck } from "lucide-react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { confirmations } from "@/lib/store/account";

const icons = [BadgeCheck, Bell, PackageCheck];

export default function ConfirmationsPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Confirmations"
        title="Payment and order confirmations."
        description="Show customers what happened after checkout: payment, SMS, and fulfillment handoff."
      />

      <section className="confirmation-grid">
        {confirmations.map((confirmation, index) => {
          const Icon = icons[index];
          return (
            <article className="confirmation-card" key={confirmation.reference}>
              <Icon size={28} />
              <span>{confirmation.status}</span>
              <h2>{confirmation.title}</h2>
              <p>{confirmation.description}</p>
              <strong>{confirmation.reference}</strong>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
