"use client";

import { useEffect, useState } from "react";
import { Bell, MessageSquareText, ShieldCheck, Tag } from "lucide-react";
import { type CustomerSettings } from "@/lib/db/settings";

const TOGGLES: { key: keyof CustomerSettings; label: string; icon: typeof Bell }[] = [
  { key: "smsOrderUpdates", label: "SMS order updates via Arkesel", icon: MessageSquareText },
  { key: "emailReceipts", label: "Email receipts", icon: Bell },
  { key: "backInStockAlerts", label: "Back-in-stock alerts", icon: Tag },
  { key: "marketingOptIn", label: "Marketing offers and promotions", icon: ShieldCheck },
];

export function SettingsControls() {
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CustomerSettings | null) => {
        if (data) setSettings(data);
        else setMessage("Sign in to manage your notification preferences.");
      });
  }, []);

  function toggle(key: keyof CustomerSettings) {
    setSaved(false);
    setSettings((current) => (current ? { ...current, [key]: !current[key] } : current));
  }

  async function save() {
    if (!settings) return;
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(response.ok);
    if (!response.ok) setMessage("Unable to save settings. Please sign in and try again.");
  }

  if (!settings) {
    return <p className="inline-notice">{message || "Loading settings..."}</p>;
  }

  return (
    <>
      {saved ? <p className="inline-notice">Settings saved.</p> : null}
      <button className="primary-action settings-save" onClick={save}>
        Save settings
      </button>
      <section className="settings-grid">
        <article className="dashboard-panel">
          <ShieldCheck size={24} />
          <h2>Notifications</h2>
          <div className="setting-list">
            {TOGGLES.map((toggleItem) => (
              <label key={toggleItem.key}>
                <span>{toggleItem.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[toggleItem.key])}
                  onChange={() => toggle(toggleItem.key)}
                />
              </label>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
