import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomersPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Customer dashboard."
        description="Manage profile details, orders, saved products, addresses, returns, and notification preferences."
      />

      <CustomerAccountClient />
    </AppShell>
  );
}
