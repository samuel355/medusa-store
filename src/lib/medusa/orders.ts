import type { HttpTypes } from "@medusajs/types";
import type { OrderDetail } from "@/lib/db/orders";

export function mapMedusaOrder(order: HttpTypes.StoreOrder): OrderDetail {
  const items = (order.items ?? []).map((item) => ({
    title: item.title ?? "Product",
    sku: item.variant_sku ?? "",
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: item.total,
  }));
  const address = order.shipping_address;
  return {
    id: order.id,
    orderNumber: String(order.display_id ?? order.id),
    status: order.status,
    paymentStatus: order.payment_status === "captured" || order.payment_status === "authorized" ? "paid" : order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping_total,
    currency: order.currency_code,
    placedAt: order.created_at instanceof Date ? order.created_at.toISOString() : String(order.created_at),
    email: order.email ?? "",
    phone: address?.phone ?? "",
    shippingAddress: { line1: address?.address_1, city: address?.city, countryCode: address?.country_code },
    itemsSummary: items.map((item) => item.title).join(", "),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

export async function getMedusaOrderById(orderId: string): Promise<OrderDetail | null> {
  // Only the "order_" prefix is case-insensitive here — a caller that uppercases
  // user input (e.g. the tracking page's search box) still matches. The ULID
  // suffix is intentionally left untouched: Medusa generates it uppercase, and
  // lowercasing the whole string (as an earlier version of this function did)
  // silently breaks every lookup since the ID becomes case-mismatched.
  const match = /^order_(.+)$/i.exec(orderId.trim());
  if (!match) return null;
  const id = `order_${match[1]}`;
  try {
    const { medusaSdk } = await import("./sdk");
    const { order } = await medusaSdk.store.order.retrieve(id, { fields: "+payment_status,+fulfillment_status,*items,*shipping_address" });
    return mapMedusaOrder(order);
  } catch {
    return null;
  }
}
