import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CartPageClient } from "@/components/storefront/CartPageClient";
import { CreditCard, MessageSquareText, PackageCheck } from "lucide-react";

export default function CartPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Shopping cart"
        title="Review your items."
        description="Update quantities, remove products, and continue to local checkout."
      />
      <CartPageClient />
      <section className="checkout-support-strip">
        <article>
          <CreditCard size={22} />
          <strong>Paystack checkout</strong>
          <span>Card and mobile money initialization is called before fallback confirmation.</span>
        </article>
        <article>
          <MessageSquareText size={22} />
          <strong>SMS-ready updates</strong>
          <span>Order status is structured for Arkesel notifications and delivery messages.</span>
        </article>
        <article>
          <PackageCheck size={22} />
          <strong>Order continuity</strong>
          <span>Confirmations, order history, and tracking read from the checkout order record.</span>
        </article>
      </section>
    </AppShell>
  );
}
