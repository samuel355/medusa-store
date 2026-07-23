import { Truck } from "lucide-react";
import { Suspense } from "react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { TrackingPageClient } from "@/components/storefront/TrackingPageClient";

export default function TrackingPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Tracking"
        title="Track your order."
        description="Follow payment, packing, dispatch, and delivery updates for your Begnon order."
        className="tracking-hero"
        aside={
          <div className="profile-card">
            <Truck size={28} />
            <strong>Live delivery status</strong>
            <span>SMS updates enabled</span>
          </div>
        }
      />

      <Suspense fallback={<section className="dashboard-panel">Loading tracking details...</section>}>
        <TrackingPageClient />
      </Suspense>
    </AppShell>
  );
}
