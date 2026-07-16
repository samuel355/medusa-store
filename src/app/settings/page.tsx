import { Bell, CreditCard, ShieldCheck } from "lucide-react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { settingsGroups } from "@/lib/store/account";

const icons = [ShieldCheck, Bell, CreditCard];

export default function SettingsPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Settings"
        title="Customer preferences."
        description="Manage account access, notifications, saved delivery details, and checkout defaults."
      />

      <section className="settings-grid">
        {settingsGroups.map((group, index) => {
          const Icon = icons[index];
          return (
            <article className="dashboard-panel" key={group.title}>
              <Icon size={24} />
              <h2>{group.title}</h2>
              <div className="setting-list">
                {group.items.map((item) => (
                  <label key={item}>
                    <span>{item}</span>
                    <input type="checkbox" defaultChecked />
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
