"use client";

import { CreditCard, PackageCheck, RotateCcw, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cancelOrder, fetchOrders, reorder, type OrderSummary } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";

export function OrdersPageClient() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchOrders().then((result) => {
      setOrders(result);
      setIsLoading(false);
    });
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const statusMatch = status === "All" || order.status === status;
      const queryMatch =
        !query.trim() ||
        [order.orderNumber, order.itemsSummary, order.paymentStatus, order.status]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase());
      return statusMatch && queryMatch;
    });
  }, [orders, query, status]);

  const statuses = Array.from(new Set(["All", ...orders.map((order) => order.status)]));

  async function handleCancel(order: OrderSummary) {
    const cancelled = await cancelOrder(order.orderNumber);
    setMessage(cancelled ? `${order.orderNumber} cancelled.` : "This order can no longer be cancelled.");
    if (cancelled) {
      setOrders(await fetchOrders());
    }
  }

  async function handleReorder(order: OrderSummary) {
    const ok = await reorder(order.orderNumber);
    setMessage(ok ? `${order.orderNumber} items moved back to cart.` : "Unable to reorder those items.");
  }

  if (isLoading) return null;

  return (
    <>
      <section className="order-toolbar">
        <label>
          <Search size={17} />
          <input
            aria-label="Search orders"
            placeholder="Search by order, item, payment, or status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>
      {message ? <p className="inline-notice orders-message">{message}</p> : null}
      <section className="orders-table">
        {filteredOrders.map((order) => (
          <article key={order.id}>
            <div>
              <strong>{order.orderNumber}</strong>
              <span>{new Date(order.placedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <PackageCheck size={18} />
              <span>{order.itemsSummary}</span>
            </div>
            <div>
              <Truck size={18} />
              <span>{order.status}</span>
            </div>
            <div>
              <CreditCard size={18} />
              <span>{order.paymentStatus}</span>
            </div>
            <b>{formatMoney(order.total)}</b>
            <div className="order-actions">
              <a href={`/tracking?order=${order.orderNumber}`}>Track</a>
              <button aria-label={`Reorder ${order.orderNumber}`} onClick={() => handleReorder(order)}>
                <RotateCcw size={16} />
              </button>
              <button aria-label={`Cancel ${order.orderNumber}`} onClick={() => handleCancel(order)}>
                <XCircle size={16} />
              </button>
            </div>
          </article>
        ))}
        {!filteredOrders.length ? (
          <article className="orders-empty">
            <strong>No orders found.</strong>
            <span>{orders.length ? "Try another status or search term." : "Orders you place will show up here."}</span>
          </article>
        ) : null}
      </section>
    </>
  );
}
