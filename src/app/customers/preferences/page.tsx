import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomerPreferencesPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Preferences."
        description="Notification channels, Mobile Money defaults, delivery contact, and checkout preferences."
      />
      <CustomerAccountClient view="preferences" />
    </AppShell>
  );
}
