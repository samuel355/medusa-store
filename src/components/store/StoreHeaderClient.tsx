"use client";

import { Grid3X3, Heart, ListFilter, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { storeBrand } from "@/lib/store/brand";
import { BrandMark } from "@/components/store/BrandMark";
import { useCart } from "@/lib/medusa/cart";

type StoreHeaderClientProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  accountHref: string;
};

export function StoreHeaderClient({ isSignedIn, isAdmin, accountHref }: StoreHeaderClientProps) {
  const { cart } = useCart();
  const cartCount = cart.totals.quantity;
  const [query, setQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("begnon_search", query);
    window.location.href = "/shop";
  }

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/shop?category=Men", label: "Men" },
    { href: "/shop?category=Women", label: "Women" },
    { href: "/shop?category=New%20Arrivals", label: "New Arrivals" },
    { href: "/shop?category=Best%20Sellers", label: "Best Sellers" },
    { href: "/shop?category=Sale", label: "Sale" },
    { href: "/shop?category=Collections", label: "Collections" },
    { href: "/#deals", label: "Flash deals" },
  ];

  return (
    <header className="market-header">
      <div className="market-top">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <BrandMark size={30} />
          </span>
          {storeBrand.name}
        </Link>
        <form className="market-search" role="search" onSubmit={search}>
          <button>Shop</button>
          <input
            aria-label="Search products"
            placeholder="Search shirts, dresses, kaftans, sizes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button aria-label="Search">
            <Search size={20} />
            Search
          </button>
        </form>
        <div className="market-actions">
          <a href={accountHref}>
            <UserRound size={18} />
            {isAdmin ? "Dashboard" : "Account"}
          </a>
          <a href="/customers/wishlist">
            <Heart size={18} />
            Wishlist
          </a>
          <a className="cart-link" href="/cart">
            <ShoppingBag size={18} />
            Cart
            <span>{cartCount}</span>
          </a>
          <button
            className="icon-button mobile-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X size={20} /> : <ListFilter size={20} />}
          </button>
        </div>
      </div>
      <nav className="market-nav" aria-label="Store navigation">
        <a href="/shop">
          <Grid3X3 size={16} />
          Shop
        </a>
        {navLinks.slice(1).map((link) => (
          <a href={link.href} key={link.href}>{link.label}</a>
        ))}
      </nav>
      <div className={`mobile-menu-panel ${isMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-grid">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href} onClick={() => setIsMenuOpen(false)}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="mobile-menu-actions">
          <a href={accountHref} onClick={() => setIsMenuOpen(false)}>
            <UserRound size={17} />
            {isSignedIn ? (isAdmin ? "Admin dashboard" : "Dashboard") : "Login"}
          </a>
          <a href="/customers/wishlist" onClick={() => setIsMenuOpen(false)}>
            <Heart size={17} />
            Wishlist
          </a>
          <a href="/cart" onClick={() => setIsMenuOpen(false)}>
            <ShoppingBag size={17} />
            Cart ({cartCount})
          </a>
          {isSignedIn ? (
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="logout-link">
                Log out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
