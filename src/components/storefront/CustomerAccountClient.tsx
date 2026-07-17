"use client";

import {
  Bell,
  CreditCard,
  Heart,
  Home,
  MapPin,
  PackageCheck,
  Phone,
  RotateCcw,
  Save,
  Settings,
  Truck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Customer } from "@/lib/db/customers";
import { fetchOrders, type OrderSummary } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";
import { fetchWishlist, WishlistItem, WISHLIST_UPDATED_EVENT } from "@/lib/utils/wishlist";

export type CustomerDashboardView = "overview" | "orders" | "wishlist" | "addresses" | "returns" | "preferences";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "processing", "packed", "out_for_delivery"]);

export function CustomerAccountClient({ view = "overview" }: Readonly<{ view?: CustomerDashboardView }>) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", phone: "", email: "" });
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function syncWishlist() {
      fetchWishlist().then(setWishlist);
    }

    fetch("/api/customers/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { customer: Customer } | null) => {
        if (data?.customer) {
          setCustomer(data.customer);
          setProfileDraft({
            displayName: data.customer.displayName,
            phone: data.customer.phone,
            email: data.customer.email,
          });
        } else {
          setMessage("Sign in to see your account details.");
        }
      });
    fetchOrders().then(setOrders);
    syncWishlist();
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total orders", value: String(orders.length) },
      { label: "Active deliveries", value: String(orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length) },
      { label: "Wishlist items", value: String(wishlist.length) },
      { label: "Reward points", value: String(customer?.rewardPoints ?? 0) },
    ],
    [orders, wishlist, customer]
  );
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status));
  const latestOrder = orders[0];

  async function saveProfile() {
    const response = await fetch("/api/customers/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileDraft),
    });
    if (response.ok) {
      const data = (await response.json()) as { customer: Customer };
      setCustomer(data.customer);
      setSaved(true);
    }
  }

  const navItems: { label: string; icon: typeof Home; href: string; view: CustomerDashboardView }[] = [
    { label: "Overview", icon: Home, href: "/customers", view: "overview" },
    { label: "Orders", icon: PackageCheck, href: "/customers/orders", view: "orders" },
    { label: "Wishlist", icon: Heart, href: "/customers/wishlist", view: "wishlist" },
    { label: "Addresses", icon: MapPin, href: "/customers/addresses", view: "addresses" },
    { label: "Returns", icon: RotateCcw, href: "/customers/returns", view: "returns" },
    { label: "Preferences", icon: Settings, href: "/customers/preferences", view: "preferences" },
  ];

  if (!customer) {
    return <p className="inline-notice">{message || "Loading account..."}</p>;
  }

  return (
    <section className="account-dashboard-shell">
      <aside className="account-sidebar" aria-label="Customer dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a className={view === item.view ? "active" : ""} href={item.href} key={item.label}>
              <Icon size={17} />
              {item.label}
            </a>
          );
        })}
      </aside>

      <div className="account-dashboard-main">
        {view === "overview" ? (
          <>
          <section id="overview" className="account-welcome-panel">
            <div>
              <p className="kicker">Dashboard</p>
              <h2>Welcome back, {customer.displayName.split(" ")[0]}.</h2>
              <p>
                Manage orders, saved products, delivery details, returns, and notification preferences from one account
                workspace.
              </p>
            </div>
            <div className="account-status-card">
              <UserRound size={22} />
              <strong>{customer.tier}</strong>
              <span>Member since {new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </section>

          <section className="metric-grid account-metrics">
            {stats.map((stat) => (
              <article key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>

          <section className="dashboard-grid account-panel-grid">
            <article className="dashboard-panel">
              <h2>Customer details</h2>
              <div className="profile-form">
                <label>
                  Name
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) => {
                      setSaved(false);
                      setProfileDraft((current) => ({ ...current, displayName: event.target.value }));
                    }}
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={profileDraft.phone}
                    onChange={(event) => {
                      setSaved(false);
                      setProfileDraft((current) => ({ ...current, phone: event.target.value }));
                    }}
                  />
                </label>
                <label>
                  Email
                  <input
                    value={profileDraft.email}
                    onChange={(event) => {
                      setSaved(false);
                      setProfileDraft((current) => ({ ...current, email: event.target.value }));
                    }}
                  />
                </label>
                <button className="primary-action" onClick={saveProfile}>
                  <Save size={18} />
                  Save profile
                </button>
                {saved ? <p className="inline-notice">Profile saved.</p> : null}
              </div>
            </article>

            <article className="dashboard-panel">
              <h2>Live account status</h2>
              <div className="account-signal-grid">
                <span>
                  <Phone size={17} />
                  <strong>Phone</strong>
                  {customer.phone || "Not set"}
                </span>
                <span>
                  <Truck size={17} />
                  <strong>Active deliveries</strong>
                  {activeOrders.length ? `${activeOrders.length} in progress` : "No active delivery"}
                </span>
                <span>
                  <CreditCard size={17} />
                  <strong>Preferred payment</strong>
                  Mobile Money
                </span>
              </div>
            </article>
          </section>
          </>
        ) : null}

        {view === "orders" ? (
          <section id="orders" className="dashboard-panel account-orders-panel">
            <div className="account-section-head">
              <div>
                <p className="kicker">Orders</p>
                <h2>Order history and tracking.</h2>
              </div>
              <a href="/orders">View all orders</a>
            </div>
            <div className="order-list compact account-orders">
              {orders.slice(0, 4).map((order) => (
                <a href={`/tracking?order=${order.orderNumber}`} key={order.id}>
                  <PackageCheck size={18} />
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <span>{order.status} / {order.fulfillmentStatus}</span>
                  </div>
                  <b>{formatMoney(order.total)}</b>
                </a>
              ))}
              {!orders.length ? (
                <div className="account-empty-state">
                  <PackageCheck size={24} />
                  <strong>No orders yet</strong>
                  <span>Checkout from the cart to create a trackable order record.</span>
                  <a className="primary-action" href="/shop">Shop products</a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {view === "addresses" ? (
          <section id="addresses" className="account-card-grid">
            <article className="dashboard-panel">
              <h2>Latest order address</h2>
              {latestOrder ? (
                <p>Delivery details are attached to order {latestOrder.orderNumber}.</p>
              ) : (
                <p>No completed checkout yet, so there is no delivery address on file.</p>
              )}
              <span>Saved address book management is coming in a future update.</span>
            </article>
          </section>
        ) : null}

        {view === "wishlist" ? (
          <section id="saved" className="wishlist-grid">
            <div className="market-section-head">
              <div>
                <p className="kicker">Wishlist</p>
                <h2>Saved products.</h2>
              </div>
              <a href="/shop">Browse shop</a>
            </div>
            <div className="featured-product-grid">
              {wishlist.map((item) => (
                <a className="featured-product-card" href={`/products/${item.slug}`} key={item.productId}>
                  <img src={item.image} alt={item.name} />
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  <strong>{formatMoney(item.price)}</strong>
                </a>
              ))}
              {!wishlist.length ? <p className="muted-copy">Save products from the shop to see them here.</p> : null}
            </div>
          </section>
        ) : null}

        {view === "returns" ? (
          <section id="returns" className="account-card-grid">
            <article className="dashboard-panel">
              <h2>Returns and exchanges</h2>
              <p>Start a size exchange or refund request for eligible delivered orders.</p>
              <a className="secondary-action" href="/orders">Review orders</a>
            </article>
            <article className="dashboard-panel">
              <h2>Refund status</h2>
              <p>No active refund requests. Eligible orders will show exchange and refund actions here.</p>
              <span>Return notifications are sent through SMS and email.</span>
            </article>
          </section>
        ) : null}

        {view === "preferences" ? (
          <section id="preferences" className="account-card-grid">
            <article className="dashboard-panel">
              <h2>Notification preferences</h2>
              <div className="account-preference-list">
                <span>
                  <Bell size={17} />
                  SMS for payment, dispatch, and delivery
                </span>
                <span>
                  <Heart size={17} />
                  Back-in-stock wishlist alerts
                </span>
                <span>
                  <PackageCheck size={17} />
                  Email receipts and return updates
                </span>
              </div>
              <a className="secondary-action" href="/settings">Manage in settings</a>
            </article>
          </section>
        ) : null}
      </div>
    </section>
  );
}
