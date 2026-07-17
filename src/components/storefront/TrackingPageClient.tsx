"use client";

import { MapPin, PackageCheck, Search, Truck } from "lucide-react";
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
      <section className="tracking-toolbar">
        <label>
          <Search size={17} />
          <input
            aria-label="Order tracking lookup"
            placeholder="Enter order number e.g. SOB-123456"
            value={lookup}
            onChange={(event) => setLookup(event.target.value.toUpperCase())}
          />
        </label>
        <button className="primary-action" onClick={lookupOrder}>
          Track order
        </button>
      </section>
      {message ? <p className="inline-notice tracking-message">{message}</p> : null}
      {!isLoading && order ? (
        <section className="tracking-grid">
          <article className="dashboard-panel">
            <h2>{order.orderNumber}</h2>
            <p className="tracking-summary">
              {order.itemsSummary} · {formatMoney(order.total)}
            </p>
            <div className="timeline">
              {buildTimeline(order).map((event) => (
                <div className={event.state} key={event.title}>
                  <span />
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.description}</p>
                    <small>{event.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="dashboard-panel">
            <h2>Delivery details</h2>
            <div className="detail-list">
              <span>
                <MapPin size={17} /> {(order.shippingAddress.line1 as string | undefined) ?? "Address on file"}
              </span>
              <span>
                <PackageCheck size={17} /> {order.status}
              </span>
              <span>
                <Truck size={17} /> Fulfillment: {order.fulfillmentStatus}
              </span>
            </div>
          </article>
        </section>
      ) : !isLoading ? (
        <section className="dashboard-panel empty-results">
          <h2>Enter an order number to see tracking.</h2>
          <p>You can find your order number in your order history or confirmation email.</p>
        </section>
      ) : null}
    </>
  );
}
