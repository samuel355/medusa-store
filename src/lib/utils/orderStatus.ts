export type CustomerOrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "canceled";

const PAID_STATUSES = new Set(["captured", "partially_captured", "refunded", "partially_refunded"]);
const SHIPPED_FULFILLMENT = new Set(["shipped", "partially_shipped"]);
const DELIVERED_FULFILLMENT = new Set(["delivered", "partially_delivered"]);

// Medusa's own status/paymentStatus/fulfillmentStatus enums are too granular
// and too technical to show a customer directly (e.g. "partially_captured",
// "requires_action") - this collapses them into the five stages a customer
// actually cares about, in one place every order view can share.
export function deriveOrderStatus(order: {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}): CustomerOrderStatus {
  if (order.status === "canceled" || order.fulfillmentStatus === "canceled") return "canceled";
  if (DELIVERED_FULFILLMENT.has(order.fulfillmentStatus)) return "delivered";
  if (SHIPPED_FULFILLMENT.has(order.fulfillmentStatus)) return "shipped";
  if (PAID_STATUSES.has(order.paymentStatus)) return "confirmed";
  return "pending";
}

export const ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
};

export const ORDER_STATUS_ORDER: CustomerOrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "canceled"];

export function isOrderPaid(paymentStatus: string): boolean {
  return PAID_STATUSES.has(paymentStatus);
}
