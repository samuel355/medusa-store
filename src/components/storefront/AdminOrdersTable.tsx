"use client";

import { useState } from "react";
import { type OrderSummary } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "out_for_delivery", "delivered", "cancelled", "refunded"];
const FULFILLMENT_STATUSES = ["not_fulfilled", "queued", "packed", "shipped", "delivered", "returned"];

export function AdminOrdersTable({ orders: initialOrders }: Readonly<{ orders: OrderSummary[] }>) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState("");

  async function updateOrder(order: OrderSummary, patch: { status?: string; fulfillmentStatus?: string }) {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      setMessage(`Unable to update ${order.orderNumber}.`);
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, ...patch } : item))
    );
    setMessage(`${order.orderNumber} updated.`);
  }

  return (
    <section className="market-section">
      <h2>Orders</h2>
      {message ? <p className="inline-notice">{message}</p> : null}
      <div className="orders-table">
        {orders.map((order) => (
          <article key={order.id}>
            <div>
              <strong>{order.orderNumber}</strong>
              <span>{new Date(order.placedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span>{order.itemsSummary}</span>
            </div>
            <select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })}>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={order.fulfillmentStatus}
              onChange={(event) => updateOrder(order, { fulfillmentStatus: event.target.value })}
            >
              {FULFILLMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <span>{order.paymentStatus}</span>
            <b>{formatMoney(order.total)}</b>
          </article>
        ))}
        {!orders.length ? (
          <article className="orders-empty">
            <strong>No orders yet.</strong>
          </article>
        ) : null}
      </div>
    </section>
  );
}
