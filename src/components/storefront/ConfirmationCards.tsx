"use client";

import { BadgeCheck, Bell, PackageCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchOrderByNumber, type OrderDetail } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";

export function ConfirmationCards() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderNumber));

  useEffect(() => {
    if (!orderNumber) return;
    fetchOrderByNumber(orderNumber).then((result) => {
      setOrder(result);
      setIsLoading(false);
    });
  }, [orderNumber]);

  // isLoading only ever applies while there's an order to fetch; deriving it here
  // (instead of forcing it false from inside the effect) also correctly stops the
  // loading state immediately if orderNumber is ever cleared mid-fetch.
  if (orderNumber && isLoading) return null;

  if (!order) {
    return (
      <section className="dashboard-panel empty-results">
        <h2>No order to confirm yet.</h2>
        <p>Complete checkout to see your payment and fulfillment confirmation here.</p>
      </section>
    );
  }

  const cards = [
    {
      icon: BadgeCheck,
      status: order.paymentStatus === "paid" ? "Successful" : "Pending",
      title: "Payment result",
      description:
        order.paymentStatus === "paid"
          ? `Payment verified for order ${order.orderNumber}.`
          : "Waiting for Paystack to confirm this payment.",
    },
    {
      icon: Bell,
      status: order.phone ? "Ready" : "No phone on file",
      title: "SMS notification",
      description: order.phone
        ? "Order and delivery updates are sent to the phone number on this order."
        : "Add a phone number at checkout to receive SMS updates.",
    },
    {
      icon: PackageCheck,
      status: order.fulfillmentStatus === "not_fulfilled" ? "Pending" : "Queued",
      title: "Fulfillment",
      description:
        order.fulfillmentStatus === "not_fulfilled"
          ? "Fulfillment starts once payment is confirmed."
          : "Order handoff created for packing and dispatch.",
    },
  ];

  return (
    <>
      <section className="dashboard-panel confirmation-summary">
        <h2>Order {order.orderNumber}</h2>
        <p>
          {order.itemCount} item(s), total {formatMoney(order.total)}. Status: {order.status}.
        </p>
        <div className="confirmation-items">
          {order.items.map((item) => (
            <span key={item.title}>
              {item.quantity}x {item.title}
            </span>
          ))}
        </div>
        <div className="confirmation-actions">
          <a href={`/tracking?order=${order.orderNumber}`}>Track order</a>
          <a href="/shop">Continue shopping</a>
        </div>
      </section>
      <section className="confirmation-grid">
        {cards.map((card) => (
          <article className="confirmation-card" key={card.title}>
            <card.icon size={28} />
            <span>{card.status}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <strong>{order.orderNumber}</strong>
          </article>
        ))}
      </section>
    </>
  );
}
