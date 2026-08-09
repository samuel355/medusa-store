import { Suspense } from "react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerDashboardShell } from "@/components/storefront/CustomerDashboardShell";
import { ConfirmationCards } from "@/components/storefront/ConfirmationCards";
import { resolveCustomer } from "@/lib/auth/session";
import { BadgeCheck, MessageSquareText, Truck } from "lucide-react";

const loadingFallback = <section className="dashboard-panel">Loading confirmation...</section>;

const nextSteps = (
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
);

export default async function ConfirmationsPage() {
  const customer = await resolveCustomer();

  if (customer) {
    return (
      <AppShell className="app-page">
        <CustomerDashboardShell>
          <div className="account-content-head">
            <p className="kicker">Customer account</p>
            <h1>Order confirmation</h1>
          </div>
          <Suspense fallback={loadingFallback}>
            <ConfirmationCards />
          </Suspense>
          {nextSteps}
        </CustomerDashboardShell>
      </AppShell>
    );
  }

  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Confirmations"
        title="Payment and order confirmations."
        description="Show customers what happened after checkout: payment, SMS, and fulfillment handoff."
      />

      <Suspense fallback={loadingFallback}>
        <ConfirmationCards />
      </Suspense>
      {nextSteps}
    </AppShell>
  );
}
