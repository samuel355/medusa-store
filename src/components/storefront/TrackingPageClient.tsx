"use client";

import { MapPin, Package, PackageCheck, Search, Truck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchOrderByNumber, type OrderDetail } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";

function buildTimeline(order: OrderDetail) {
  const fulfilled = ["queued", "packed", "shipped", "delivered"];
  const shipped = ["shipped", "delivered"];

  return [
    {
      title: "Order placed",
      description: "Order created and awaiting payment confirmation.",
      time: new Date(order.placedAt).toLocaleString(),
      state: "complete",
    },
    {
      title: "Payment confirmed",
      description: order.paymentStatus === "paid" ? "Payment verified." : "Waiting for payment confirmation.",
      time: order.paymentStatus === "paid" ? "Confirmed" : "Pending",
      state: order.paymentStatus === "paid" ? "complete" : "pending",
    },
    {
      title: "Fulfillment queued",
      description: "Order handed off for packing.",
      time: fulfilled.includes(order.fulfillmentStatus) ? "Queued" : "Pending",
      state: fulfilled.includes(order.fulfillmentStatus) ? "complete" : "pending",
    },
    {
      title: "Out for delivery",
      description: "Courier is on the way.",
      time: shipped.includes(order.fulfillmentStatus) ? "In transit" : "Pending",
      state: shipped.includes(order.fulfillmentStatus) ? "active" : "pending",
    },
    {
      title: "Delivered",
      description: "Order delivered to customer.",
      time: order.fulfillmentStatus === "delivered" ? "Delivered" : "Pending",
      state: order.fulfillmentStatus === "delivered" ? "complete" : "pending",
    },
  ];
}

const STATUS_LABELS: Record<string, string> = {
  not_fulfilled: "Processing",
  queued: "Queued",
  packed: "Packed",
  shipped: "In transit",
  delivered: "Delivered",
};

export function TrackingPageClient() {
  const searchParams = useSearchParams();
  const requestedOrder = searchParams.get("order") ?? "";
  const [lookup, setLookup] = useState(requestedOrder);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(requestedOrder));

  useEffect(() => {
    if (!requestedOrder) return;
    fetchOrderByNumber(requestedOrder).then((result) => {
      setOrder(result);
      setIsLoading(false);
      if (!result) setMessage("No matching order found.");
    });
  }, [requestedOrder]);

  async function lookupOrder() {
    if (!lookup.trim()) return;
    setIsLoading(true);
    const result = await fetchOrderByNumber(lookup.trim());
    setOrder(result);
    setIsLoading(false);
    setMessage(result ? `${lookup} loaded.` : "No matching order found.");
  }

  return (
    <>
      <section className="ed-track-search">
        <p className="ed-eyebrow">Order tracking</p>
        <h1>Track your order</h1>
        <p className="ed-track-search-sub">Enter your order number to see exactly where it is in the delivery flow.</p>
        <div className="ed-search ed-track-search-box">
          <Search size={15} />
          <input
            aria-label="Order tracking lookup"
            placeholder="e.g. order_01H..."
            value={lookup}
            onChange={(event) => setLookup(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") lookupOrder(); }}
          />
          <button onClick={lookupOrder}>Find status</button>
        </div>
      </section>

      {message ? <p className="ed-notice">{message}</p> : null}

      {!isLoading && order ? (
        <section className="ed-track-grid">
          <div className="ed-track-timeline">
            <div className="ed-track-timeline-head">
              <h2>Shipment status</h2>
              <span className="ed-track-status-pill">{STATUS_LABELS[order.fulfillmentStatus] ?? order.fulfillmentStatus}</span>
            </div>
            <div>
              {buildTimeline(order).map((event) => (
                <div className={`ed-track-timeline-item ${event.state}`} key={event.title}>
                  <span className="ed-track-timeline-dot">{event.state === "active" ? <span /> : null}</span>
                  <div>
                    <p className="ed-track-timeline-time">{event.time}</p>
                    <p className="ed-track-timeline-title">{event.title}</p>
                    <p className="ed-track-timeline-desc">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ed-track-details-col">
            <div>
              <h3>Delivery details</h3>
              <div className="ed-track-detail-row">
                <MapPin size={16} />
                <span>{(order.shippingAddress.line1 as string | undefined) ?? "Address on file"}</span>
              </div>
              <div className="ed-track-detail-row">
                <PackageCheck size={16} />
                <span>Order status: {order.status}</span>
              </div>
              <div className="ed-track-detail-row">
                <Truck size={16} />
                <span>Same-day Accra, next-day nationwide</span>
              </div>
              <dl className="ed-spec-list">
                <div>
                  <dt>Order value</dt>
                  <dd>{formatMoney(order.total)}</dd>
                </div>
                <div>
                  <dt>Items</dt>
                  <dd>{order.itemCount}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3>Items in this order</h3>
              {order.items.map((item) => (
                <div className="ed-track-item-row" key={item.sku}>
                  <Package size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>Qty {item.quantity}</span>
                  </div>
                  <strong>{formatMoney(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : !isLoading ? (
        <section className="ed-empty">
          <h2>Enter an order number to see tracking.</h2>
          <p>You can find your order number in your order history or confirmation email.</p>
        </section>
      ) : null}
    </>
  );
}
