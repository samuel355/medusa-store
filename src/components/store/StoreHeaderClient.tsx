"use client";

import { Grid3X3, Heart, ListFilter, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { cart } = useCart();
  const cartCount = cart.totals.quantity;
  const [query, setQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      window.localStorage.setItem("begnon_search", trimmed);
    } else {
      window.localStorage.removeItem("begnon_search");
    }
    router.push("/shop");
  }

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/shop?category=Men", label: "Men" },
    { href: "/shop?category=Women", label: "Women" },
    { href: "/shop?pill=New%20arrivals", label: "New Arrivals" },
    { href: "/shop?pill=Sale", label: "Sale" },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <BrandMark size={30} />
          </span>
          {storeBrand.name}
        </Link>
        <form className="search-bar" role="search" onSubmit={search}>
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search products"
            placeholder="Search shirts, dresses, kaftans, sizes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <div className="nav-actions">
          <Link href={accountHref} aria-label={isAdmin ? "Dashboard" : "Account"} title={isAdmin ? "Dashboard" : "Account"}>
            <UserRound size={18} />
          </Link>
          <Link href="/customers/wishlist" aria-label="Wishlist" title="Wishlist">
            <Heart size={18} />
          </Link>
          <Link className="cart-button" href="/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} title="Cart">
            <ShoppingBag size={18} />
            <span>{cartCount}</span>
          </Link>
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
      <nav className="navlinks" aria-label="Store navigation">
        <Link href="/shop">
          <Grid3X3 size={16} />
          Shop
        </Link>
        {navLinks.slice(1).map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={`mobile-panel ${isMenuOpen ? "open" : ""}`}>
        <div className="mobile-grid">
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setIsMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <Link href={accountHref} onClick={() => setIsMenuOpen(false)}>
            <UserRound size={17} />
            {isSignedIn ? (isAdmin ? "Admin dashboard" : "Dashboard") : "Login"}
          </Link>
          <Link href="/customers/wishlist" onClick={() => setIsMenuOpen(false)}>
            <Heart size={17} />
            Wishlist
          </Link>
          <Link href="/cart" onClick={() => setIsMenuOpen(false)}>
            <ShoppingBag size={17} />
            Cart ({cartCount})
          </Link>
          {isSignedIn ? (
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-link">
                Log out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
