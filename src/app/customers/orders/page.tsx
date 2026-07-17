import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomerOrdersPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Orders and tracking."
        description="Review local order history, payment status, fulfilment progress, delivery ETA, and tracking links."
      />
      <CustomerAccountClient view="orders" />
    </AppShell>
  );
}
