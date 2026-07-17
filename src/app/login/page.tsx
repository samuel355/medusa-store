import { Bell, Heart, PackageCheck } from "lucide-react";
import { Suspense } from "react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { AuthPanel } from "@/components/storefront/AuthPanel";

export default function LoginPage() {
  return (
    <AppShell className="app-page auth-page">
      <AppHero
        kicker="Login"
        title="Access your fashion account."
        description="Continue with phone OTP, email password, or Google to manage orders, wishlist, addresses, and returns."
      />
      <Suspense fallback={null}>
        <AuthPanel initialMode="login" />
      </Suspense>
      <section className="auth-benefit-grid">
        <article>
          <PackageCheck size={20} />
          <strong>Track orders</strong>
          <span>See payment, processing, dispatch, and delivery status.</span>
        </article>
        <article>
          <Heart size={20} />
          <strong>Save products</strong>
          <span>Keep wishlist items and back-in-stock alerts ready.</span>
        </article>
        <article>
          <Bell size={20} />
          <strong>Get updates</strong>
          <span>SMS, WhatsApp, and email notifications for key activity.</span>
        </article>
      </section>
    </AppShell>
  );
}
