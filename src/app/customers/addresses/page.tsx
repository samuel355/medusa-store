import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomerAddressesPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Addresses."
        description="Saved delivery location, latest order destination, and delivery communication context."
      />
      <CustomerAccountClient view="addresses" />
    </AppShell>
  );
}
