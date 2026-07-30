import { AppShell } from "@/components/store/AppShell";
import { CartPageClient } from "@/components/storefront/CartPageClient";

export default function CartPage() {
  return (
    <AppShell className="ed-page">
      <div className="ed-bag-page">
        <div className="ed-bag-heading">
          <p className="ed-eyebrow">Your bag</p>
          <h1>Shopping Bag</h1>
        </div>
        <CartPageClient />
      </div>
    </AppShell>
  );
}
