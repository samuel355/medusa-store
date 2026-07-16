import { Flame } from "lucide-react";

export function StoreFooter() {
  return (
    <footer className="footer market-footer">
      <a className="brand" href="/">
        <span className="brand-mark">
          <Flame size={18} />
        </span>
        Ember
      </a>
      <p>Single-owner ecommerce storefront with Paystack, Supabase Auth, Redis, BullMQ, Arkesel, and R2.</p>
      <div>
        <a href="/#products">Products</a>
        <a href="/orders">Orders</a>
        <a href="/tracking">Tracking</a>
        <a href="/confirmations">Confirmations</a>
      </div>
    </footer>
  );
}
