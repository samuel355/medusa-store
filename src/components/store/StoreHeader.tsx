import { Flame, Grid3X3, Menu, Search, ShoppingBag, UserRound } from "lucide-react";

export function StoreHeader() {
  return (
    <header className="market-header">
      <div className="market-top">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Flame size={18} />
          </span>
          Ember
        </a>
        <div className="market-search" role="search">
          <button>Shop</button>
          <input aria-label="Search products" placeholder="Search fashion, phones, beauty, home..." />
          <button aria-label="Search">
            <Search size={20} />
            Search
          </button>
        </div>
        <div className="market-actions">
          <a href="/customers">
            <UserRound size={18} />
            Account
          </a>
          <a className="cart-link" href="/#checkout">
            <ShoppingBag size={18} />
            Cart
            <span>3</span>
          </a>
          <button className="icon-button mobile-menu" aria-label="Menu">
            <Menu size={20} />
          </button>
        </div>
      </div>
      <nav className="market-nav" aria-label="Store navigation">
        <a href="/#categories">
          <Grid3X3 size={16} />
          All categories
        </a>
        <a href="/#products">New arrivals</a>
        <a href="/#deals">Flash deals</a>
        <a href="/orders">Orders</a>
        <a href="/tracking">Tracking</a>
        <a href="/settings">Settings</a>
        <a href="/confirmations">Confirmations</a>
        <a href="/#checkout">Paystack checkout</a>
      </nav>
    </header>
  );
}
