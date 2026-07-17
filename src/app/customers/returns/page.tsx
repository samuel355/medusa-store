import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomerReturnsPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Returns and exchanges."
        description="Request size exchanges, review refund status, and follow return communication updates."
      />
      <CustomerAccountClient view="returns" />
    </AppShell>
  );
}
