import { Bell, Heart, PackageCheck } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { AuthPanel } from "@/components/storefront/AuthPanel";

export default function RegisterPage() {
  return (
    <AppShell className="app-page auth-page">
      <AppHero
        kicker="Register"
        title="Create your Begnon account."
        description="Sign up with email, phone, or Google for faster checkout, saved addresses, wishlist, and order tracking."
        aside={
          <Image
            src="/logos/Begon-logo-v.png"
            alt="Begnon — Style, Quality, Delivered"
            width={220}
            height={194}
            className="auth-logo-lockup"
          />
        }
      />
      <Suspense fallback={null}>
        <AuthPanel initialMode="signup" />
      </Suspense>
      <section className="auth-benefit-grid">
        <article>
          <PackageCheck size={20} />
          <strong>Faster checkout</strong>
          <span>Keep delivery details and Mobile Money contact ready.</span>
        </article>
        <article>
          <Heart size={20} />
          <strong>Wishlist alerts</strong>
          <span>Save fashion picks and receive back-in-stock updates.</span>
        </article>
        <article>
          <Bell size={20} />
          <strong>Order notifications</strong>
          <span>Stay updated from confirmation to delivery.</span>
        </article>
      </section>
    </AppShell>
  );
}
