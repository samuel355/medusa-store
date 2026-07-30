import { Bell, Heart, PackageCheck } from "lucide-react";
import { Suspense } from "react";
import { AppShell } from "@/components/store/AppShell";
import { AuthPanel } from "@/components/storefront/AuthPanel";

export default function RegisterPage() {
  return (
    <AppShell className="ed-page">
      <div className="ed-auth-page">
        <Suspense fallback={null}>
          <AuthPanel initialMode="signup" />
        </Suspense>
        <section className="ed-trust-row ed-trust-row-3 ed-section">
          <div>
            <PackageCheck size={20} />
            <div>
              <strong>Faster checkout</strong>
              <span>Keep delivery details and Mobile Money contact ready.</span>
            </div>
          </div>
          <div>
            <Heart size={20} />
            <div>
              <strong>Wishlist alerts</strong>
              <span>Save fashion picks and receive back-in-stock updates.</span>
            </div>
          </div>
          <div>
            <Bell size={20} />
            <div>
              <strong>Order notifications</strong>
              <span>Stay updated from confirmation to delivery.</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
