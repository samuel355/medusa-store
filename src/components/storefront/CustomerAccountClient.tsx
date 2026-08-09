"use client";

import {
  CreditCard,
  LogIn,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  Truck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { type Customer } from "@/lib/db/customers";
import { fetchOrders, type OrderDetail } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";
import { fetchWishlist, WishlistItem, WISHLIST_UPDATED_EVENT } from "@/lib/utils/wishlist";
import { SettingsControls } from "@/components/storefront/SettingsControls";
import { storeBrand } from "@/lib/store/brand";

export type CustomerDashboardView = "overview" | "orders" | "wishlist" | "addresses" | "returns" | "preferences";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "processing", "packed", "out_for_delivery"]);

const VIEW_META: Record<CustomerDashboardView, { kicker: string; title: string }> = {
  overview: { kicker: "Customer account", title: "Customer dashboard" },
  orders: { kicker: "Customer account", title: "Orders and tracking" },
  wishlist: { kicker: "Customer account", title: "Wishlist" },
  addresses: { kicker: "Customer account", title: "Addresses" },
  returns: { kicker: "Customer account", title: "Returns and exchanges" },
  preferences: { kicker: "Customer account", title: "Preferences" },
};

function AccountLoadingSkeleton() {
  return (
    <div className="account-loading-skeleton" aria-busy="true" aria-label="Loading account">
      <div className="skeleton-card account-skeleton-banner" />
      <div className="account-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="account-skeleton-row account-skeleton-row-panels">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

export function CustomerAccountClient({ view = "overview" }: Readonly<{ view?: CustomerDashboardView }>) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", phone: "", email: "" });
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "ready">("loading");

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
          setAuthState("ready");
        } else {
          setAuthState("signed-out");
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

  const addresses = useMemo(() => {
    const byKey = new Map<string, { recipient: string; line1: string; line2: string; city: string; province: string; postalCode: string; countryCode: string; phone: string; orderNumbers: string[] }>();
    for (const order of orders) {
      const raw = order.shippingAddress as Record<string, unknown>;
      const line1 = String(raw?.line1 ?? "").trim();
      if (!line1) continue;
      const city = String(raw?.city ?? "").trim();
      const key = [line1, city, raw?.postalCode ?? ""].join("|").toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.orderNumbers.push(order.orderNumber);
        continue;
      }
      byKey.set(key, {
        recipient: String(raw?.recipient ?? "").trim(),
        line1,
        line2: String(raw?.line2 ?? "").trim(),
        city,
        province: String(raw?.province ?? "").trim(),
        postalCode: String(raw?.postalCode ?? "").trim(),
        countryCode: String(raw?.countryCode ?? "").trim().toUpperCase(),
        phone: String(raw?.phone ?? "").trim(),
        orderNumbers: [order.orderNumber],
      });
    }
    return Array.from(byKey.values());
  }, [orders]);

  const deliveredOrders = orders.filter((order) => order.fulfillmentStatus === "delivered");

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

  const meta = VIEW_META[view];

  return (
    <>
      <div className="account-content-head">
        <p className="kicker">{meta.kicker}</p>
        <h1>{meta.title}</h1>
      </div>

      {authState === "loading" ? (
        <AccountLoadingSkeleton />
      ) : authState === "signed-out" ? (
        <div className="account-empty-state account-signed-out">
          <UserRound size={24} />
          <strong>Sign in to see your account details.</strong>
          <span>Orders, wishlist, addresses, and preferences all live here once you&apos;re signed in.</span>
          <a className="primary-action" href={`/login?redirectTo=${encodeURIComponent("/customers")}`}>
            <LogIn size={18} />
            Sign in
          </a>
        </div>
      ) : !customer ? null : (
        <>
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
            {addresses.map((address) => (
              <article className="dashboard-panel account-address-card" key={address.orderNumbers.join(",")}>
                <MapPin size={20} />
                {address.recipient ? <strong>{address.recipient}</strong> : null}
                <p>
                  {address.line1}
                  {address.line2 ? <>, {address.line2}</> : null}
                  <br />
                  {[address.city, address.province, address.postalCode].filter(Boolean).join(", ")}
                  {address.countryCode ? <>, {address.countryCode}</> : null}
                </p>
                {address.phone ? (
                  <span>
                    <Phone size={14} /> {address.phone}
                  </span>
                ) : null}
                <span className="muted-copy">
                  Used on {address.orderNumbers.length} order{address.orderNumbers.length === 1 ? "" : "s"}: {address.orderNumbers.join(", ")}
                </span>
              </article>
            ))}
            {!addresses.length ? (
              <div className="account-empty-state">
                <MapPin size={24} />
                <strong>No delivery addresses yet</strong>
                <span>Addresses used at checkout will show up here once you place an order.</span>
                <a className="primary-action" href="/shop">Shop products</a>
              </div>
            ) : null}
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
                  <Image src={item.image} alt={item.name} width={400} height={348} sizes="(max-width: 768px) 45vw, 22vw" />
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
            {deliveredOrders.map((order) => (
              <article className="dashboard-panel" key={order.id}>
                <h2>{order.orderNumber}</h2>
                <p>{order.itemsSummary || `${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}</p>
                <span>Delivered · {formatMoney(order.total)}</span>
                <a
                  className="secondary-action"
                  href={`mailto:${storeBrand.email}?subject=${encodeURIComponent(`Return request — Order ${order.orderNumber}`)}`}
                >
                  <Mail size={16} />
                  Request a return
                </a>
              </article>
            ))}
            {!deliveredOrders.length ? (
              <div className="account-empty-state">
                <PackageCheck size={24} />
                <strong>No delivered orders yet</strong>
                <span>Eligible orders show a return action here once they&apos;re marked delivered.</span>
                <a className="primary-action" href="/orders">Review orders</a>
              </div>
            ) : null}
          </section>
        ) : null}

        {view === "preferences" ? (
          <section id="preferences" className="account-preferences-panel">
            <SettingsControls />
          </section>
        ) : null}
        </>
      )}
    </>
  );
}
