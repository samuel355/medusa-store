import { Clock, Flame, Mail, MapPin, Phone, ShieldCheck, Smartphone, Truck } from "lucide-react";
import { storeBrand } from "@/lib/store/brand";

export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="footer-topline">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Flame size={18} />
          </span>
          {storeBrand.name}
        </a>
        <div className="footer-trust-row" aria-label="Store promises">
          <span>
            <Smartphone size={16} /> Mobile Money first
          </span>
          <span>
            <Truck size={16} /> Same-day Accra
          </span>
          <span>
            <ShieldCheck size={16} /> Easy exchanges
          </span>
        </div>
      </div>

      <div className="footer-main">
        <div className="footer-newsletter">
          <p className="kicker">Fashion updates</p>
          <h2>New drops, sale alerts, and back-in-stock notices.</h2>
          <form>
            <input aria-label="Email for fashion updates" placeholder="Email address" type="email" />
            <button>Join</button>
          </form>
          <p>{storeBrand.tagline}</p>
        </div>

        <div className="footer-column">
          <h3>Shop</h3>
          <a href="/shop?category=Men">Men</a>
          <a href="/shop?category=Women">Women</a>
          <a href="/shop?category=New%20Arrivals">New Arrivals</a>
          <a href="/shop?category=Best%20Sellers">Best Sellers</a>
          <a href="/shop?category=Sale">Sale</a>
        </div>
        <div className="footer-column">
          <h3>Help</h3>
          <a href="/customers">My account</a>
          <a href="/orders">Order history</a>
          <a href="/tracking">Track order</a>
          <a href="/settings">Notifications</a>
          <a href="/cart">Checkout</a>
        </div>
        <div className="footer-column footer-contact">
          <h3>Contact</h3>
          <span>
            <Phone size={15} /> {storeBrand.phone}
          </span>
          <span>
            <Mail size={15} /> {storeBrand.email}
          </span>
          <span>
            <Clock size={15} /> {storeBrand.hours}
          </span>
          <span>
            <MapPin size={15} /> {storeBrand.address}
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 {storeBrand.name}. Premium fashion, Ghana-ready delivery.</span>
        <span>Mobile Money · Cards ready · Bank transfer ready</span>
      </div>
    </footer>
  );
}
