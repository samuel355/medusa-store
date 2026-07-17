import { Suspense } from "react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { ConfirmationCards } from "@/components/storefront/ConfirmationCards";
import { BadgeCheck, MessageSquareText, Truck } from "lucide-react";

export default function ConfirmationsPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Confirmations"
        title="Payment and order confirmations."
        description="Show customers what happened after checkout: payment, SMS, and fulfillment handoff."
      />

      <Suspense fallback={<section className="dashboard-panel">Loading confirmation...</section>}>
        <ConfirmationCards />
      </Suspense>
      <section className="confirmation-next-steps">
        <article>
          <BadgeCheck size={23} />
          <h2>Payment result</h2>
          <p>The order record is available immediately so the customer is not left wondering what happened.</p>
        </article>
        <article>
          <MessageSquareText size={23} />
          <h2>Customer message</h2>
          <p>Arkesel-ready SMS copy can be triggered for payment confirmation, packing, and delivery movement.</p>
        </article>
        <article>
          <Truck size={23} />
          <h2>Track next</h2>
          <p>Send customers straight to tracking after confirmation so they can follow dispatch and ETA.</p>
        </article>
      </section>
    </AppShell>
  );
}
