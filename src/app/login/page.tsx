import { Bell, Heart, PackageCheck } from "lucide-react";
import { Suspense } from "react";
import { AppShell } from "@/components/store/AppShell";
import { AuthPanel } from "@/components/storefront/AuthPanel";

export default function LoginPage() {
  return (
    <AppShell className="ed-page">
      <div className="ed-auth-page">
        <Suspense fallback={null}>
          <AuthPanel initialMode="login" />
        </Suspense>
        <section className="ed-trust-row ed-trust-row-3 ed-section">
          <div>
            <PackageCheck size={20} />
            <div>
              <strong>Track orders</strong>
              <span>See payment, processing, dispatch, and delivery status.</span>
            </div>
          </div>
          <div>
            <Heart size={20} />
            <div>
              <strong>Save products</strong>
              <span>Keep wishlist items and back-in-stock alerts ready.</span>
            </div>
          </div>
          <div>
            <Bell size={20} />
            <div>
              <strong>Get updates</strong>
              <span>SMS, WhatsApp, and email notifications for key activity.</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
