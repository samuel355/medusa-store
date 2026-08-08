"use client";

import { Grid3X3, Heart, LayoutDashboard, ListFilter, LogOut, PackageCheck, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { storeBrand } from "@/lib/store/brand";
import { BrandMark } from "@/components/store/BrandMark";
import { useCart } from "@/lib/medusa/cart";

type StoreHeaderClientProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  accountHref: string;
  displayName?: string | null;
};

export function StoreHeaderClient({ isSignedIn, isAdmin, accountHref, displayName }: StoreHeaderClientProps) {
  const router = useRouter();
  const { cart } = useCart();
  const cartCount = cart.items.length;
  const [query, setQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

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
    <>
      <div className="store-announcement">
        <p>
          Free delivery in Accra on orders over GH₵300 · Mobile Money checkout ·{" "}
          <Link href="/shop?pill=New%20arrivals">Shop new arrivals</Link>
        </p>
      </div>
      <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <BrandMark size={30} />
          </span>
          {storeBrand.name}
        </Link>
        <form className={`search-bar ${isSearchOpenMobile ? "open" : ""}`} role="search" onSubmit={search}>
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search products"
            placeholder="Search shirts, dresses, kaftans, sizes..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <button
          className="icon-button mobile-search-toggle"
          aria-label={isSearchOpenMobile ? "Close search" : "Open search"}
          onClick={() => {
            setIsSearchOpenMobile((v) => !v);
            if (!isSearchOpenMobile) {
              setTimeout(() => (document.querySelector('.search-bar input') as HTMLInputElement | null)?.focus(), 80);
            }
          }}
        >
          {isSearchOpenMobile ? <X size={16} /> : <Search size={16} />}
        </button>
        <div className="nav-actions">
          {isSignedIn ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                className="account-menu-trigger"
                aria-haspopup="true"
                aria-expanded={isAccountMenuOpen}
                aria-label={isAdmin ? "Dashboard menu" : "Account menu"}
                title={isAdmin ? "Dashboard" : "Account"}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                <UserRound size={18} />
              </button>
              {isAccountMenuOpen ? (
                <div className="account-menu-dropdown" role="menu">
                  <p className="account-menu-greeting">
                    {isAdmin ? "Signed in as admin" : `Hi, ${displayName?.trim().split(" ")[0] || "there"}`}
                  </p>
                  <Link href={accountHref} role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>
                    <LayoutDashboard size={15} />
                    {isAdmin ? "Admin dashboard" : "View account"}
                  </Link>
                  {!isAdmin ? (
                    <Link href="/customers/orders" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>
                      <PackageCheck size={15} />
                      Orders
                    </Link>
                  ) : null}
                  <form action="/api/auth/logout" method="post" className="account-menu-logout-form">
                    <button type="submit" role="menuitem" className="account-menu-logout">
                      <LogOut size={15} />
                      Log out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href={accountHref} aria-label="Account" title="Account">
              <UserRound size={18} />
            </Link>
          )}
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
    </>
  );
}
