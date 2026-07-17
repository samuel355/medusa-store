import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { SettingsControls } from "@/components/storefront/SettingsControls";
import { Bell, CreditCard, MapPin } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Settings"
        title="Customer preferences."
        description="Manage account access, notifications, saved delivery details, and checkout defaults."
      />

      <SettingsControls />
      <section className="settings-context-grid">
        <article>
          <Bell size={22} />
          <strong>Notification control</strong>
          <span>Choose how order confirmations, delivery updates, and back-in-stock alerts should reach you.</span>
        </article>
        <article>
          <CreditCard size={22} />
          <strong>Payment defaults</strong>
          <span>Keep preferred Paystack channels visible for faster future checkout.</span>
        </article>
        <article>
          <MapPin size={22} />
          <strong>Delivery defaults</strong>
          <span>Save the delivery context shoppers expect to reuse for repeat purchases.</span>
        </article>
      </section>
    </AppShell>
  );
}
