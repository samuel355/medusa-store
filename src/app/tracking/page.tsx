import { Suspense } from "react";
import { AppShell } from "@/components/store/AppShell";
import { TrackingPageClient } from "@/components/storefront/TrackingPageClient";

export default function TrackingPage() {
  return (
    <AppShell className="ed-page">
      <div className="ed-track-page">
        <Suspense fallback={<section className="ed-empty">Loading tracking details...</section>}>
          <TrackingPageClient />
        </Suspense>
      </div>
    </AppShell>
  );
}
