import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CustomerAccountClient } from "@/components/storefront/CustomerAccountClient";

export default function CustomerWishlistPage() {
  return (
    <AppShell className="app-page">
      <AppHero
        kicker="Customer account"
        title="Wishlist."
        description="Saved products, favorite styles, and back-in-stock-ready fashion picks."
      />
      <CustomerAccountClient view="wishlist" />
    </AppShell>
  );
}
