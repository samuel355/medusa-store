"use client";

import { MapPin, Package, PackageCheck, Search, Star, Truck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchOrderByNumber, trackOrder, type OrderDetail } from "@/lib/utils/orders";
import { formatMoney } from "@/lib/utils/money";
import { deriveOrderStatus, ORDER_STATUS_LABELS, type CustomerOrderStatus } from "@/lib/utils/orderStatus";
import { submitReview } from "@/lib/medusa/reviews";

type OrderItem = OrderDetail["items"][number];

function ReviewForm({ item, orderId }: { item: OrderItem; orderId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (!item.productId) return null;
  if (status === "done") return <span className="ed-review-thanks">Thanks for your review!</span>;

  if (!open) {
    return (
      <button type="button" className="ed-review-toggle" onClick={() => setOpen(true)}>
        Write a review
      </button>
    );
  }

  async function submit() {
    if (!item.productId || !body.trim()) return;
    setStatus("submitting");
    const result = await submitReview({
      productId: item.productId,
      orderId,
      orderItemId: item.id,
      rating,
      reviewBody: body.trim(),
    });
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setError(result.error ?? "Unable to submit review.");
    }
  }

  return (
    <div className="ed-review-form">
      <div className="ed-review-stars ed-review-stars-input">
        {Array.from({ length: 5 }).map((_, index) => (
          <button key={index} type="button" aria-label={`${index + 1} stars`} onClick={() => setRating(index + 1)}>
            <Star size={16} fill={index < rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <textarea
        placeholder="How was this product?"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={2}
      />
      {error ? <p className="ed-review-error">{error}</p> : null}
      <div className="ed-review-actions">
        <button type="button" onClick={submit} disabled={status === "submitting" || !body.trim()}>
          {status === "submitting" ? "Submitting..." : "Submit review"}
        </button>
        <button type="button" className="ed-review-cancel" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const STAGE_ORDER: CustomerOrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];

function stageState(stage: CustomerOrderStatus, current: CustomerOrderStatus): "complete" | "active" | "pending" {
  if (current === "canceled") return stage === "pending" ? "complete" : "pending";
  const currentIndex = STAGE_ORDER.indexOf(current);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex < currentIndex) return "complete";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

function buildTimeline(order: OrderDetail) {
  const current = deriveOrderStatus(order);

  return [
    {
      title: "Order placed",
      description: "Order created and awaiting payment confirmation.",
      time: new Date(order.placedAt).toLocaleString(),
      state: stageState("pending", current),
    },
    {
      title: "Payment confirmed",
      description: current === "pending" ? "Waiting for payment confirmation." : "Payment verified.",
      time: current === "pending" ? "Pending" : "Confirmed",
      state: stageState("confirmed", current),
    },
    {
      title: "Shipped",
      description: "Courier has picked up the order.",
      time: ["shipped", "delivered"].includes(current) ? "In transit" : "Pending",
      state: stageState("shipped", current),
    },
    {
      title: "Delivered",
      description: "Order delivered to customer.",
      time: current === "delivered" ? "Delivered" : "Pending",
      state: stageState("delivered", current),
    },
  ];
}

export function TrackingPageClient() {
  const searchParams = useSearchParams();
  const requestedOrder = searchParams.get("order") ?? "";
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(requestedOrder));

  useEffect(() => {
    // Link-based lookup (email, confirmation page) - the long order ID
    // itself is the secret, no extra verification needed.
    if (!requestedOrder) return;
    fetchOrderByNumber(requestedOrder).then((result) => {
      setOrder(result);
      setIsLoading(false);
      if (!result) setMessage("No matching order found.");
    });
  }, [requestedOrder]);

  async function lookupOrder() {
    if (!orderNumberInput.trim() || !contactInput.trim()) {
      setMessage("Enter both your order number and the email or phone used at checkout.");
      return;
    }
    setIsLoading(true);
    const { order: result, error } = await trackOrder(orderNumberInput.trim(), contactInput.trim());
    setOrder(result);
    setIsLoading(false);
    setMessage(result ? `${result.orderNumber} loaded.` : error ?? "No matching order found.");
  }

  return (
    <>
      <section className="ed-track-search">
        <p className="ed-eyebrow">Order tracking</p>
        <h1>Track your order</h1>
        <p className="ed-track-search-sub">Enter your order number and the email or phone used at checkout to see exactly where it is in the delivery flow.</p>
        <div className="ed-search ed-track-search-box ed-track-search-box-double">
          <Search size={15} />
          <input
            aria-label="Order number"
            placeholder="e.g. K3F9P2X7"
            value={orderNumberInput}
            onChange={(event) => setOrderNumberInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") lookupOrder(); }}
          />
          <input
            aria-label="Email or phone used at checkout"
            placeholder="Email or phone"
            value={contactInput}
            onChange={(event) => setContactInput(event.target.value)}
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
              <span className="ed-track-status-pill">{ORDER_STATUS_LABELS[deriveOrderStatus(order)]}</span>
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
                <span>Order {order.orderNumber}</span>
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
                <div className="ed-track-item-row" key={item.id}>
                  <Package size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>Qty {item.quantity}</span>
                    {deriveOrderStatus(order) === "delivered" ? <ReviewForm item={item} orderId={order.id} /> : null}
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
