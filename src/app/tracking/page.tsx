import { Suspense } from "react";
import { AppShell } from "@/components/store/AppShell";
import { CustomerDashboardShell } from "@/components/storefront/CustomerDashboardShell";
import { TrackingPageClient } from "@/components/storefront/TrackingPageClient";
import { resolveCustomer } from "@/lib/auth/session";

const loadingFallback = <section className="ed-empty">Loading tracking details...</section>;

export default async function TrackingPage() {
  const customer = await resolveCustomer();

  if (customer) {
    return (
      <AppShell className="app-page">
        <CustomerDashboardShell>
          <div className="account-content-head">
            <p className="kicker">Customer account</p>
            <h1>Track your order</h1>
          </div>
          <div className="ed-track-page account-track-page">
            <Suspense fallback={loadingFallback}>
              <TrackingPageClient />
            </Suspense>
          </div>
        </CustomerDashboardShell>
      </AppShell>
    );
  }

  return (
    <AppShell className="ed-page">
      <div className="ed-track-page">
        <Suspense fallback={loadingFallback}>
          <TrackingPageClient />
        </Suspense>
      </div>
    </AppShell>
  );
}
