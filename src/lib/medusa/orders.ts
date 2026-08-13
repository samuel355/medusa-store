import type { HttpTypes } from "@medusajs/types";
import type { OrderDetail } from "@/lib/db/orders";
import { toAmount } from "@/lib/utils/money";

export function mapMedusaOrder(order: HttpTypes.StoreOrder): OrderDetail {
  const items = (order.items ?? []).map((item) => {
    const quantity = toAmount(item.quantity, 1) || 1;
    const unitPrice = toAmount(item.unit_price);
    // Some Medusa query paths populate unit_price but not the line's total
    // (or vice versa) - derive whichever is missing from the other instead
    // of letting it fall back to a bare 0.
    const lineTotal = toAmount(item.total, unitPrice * quantity) || unitPrice * quantity;
    return {
      id: item.id,
      productId: item.product_id ?? null,
      title: item.title ?? "Product",
      sku: item.variant_sku ?? "",
      variantId: item.variant_id ?? null,
      quantity,
      unitPrice,
      lineTotal,
    };
  });
  const itemsSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = toAmount(order.shipping_total);
  const discount = toAmount(order.discount_total);
  // order.total/subtotal can still be mid-computation right after checkout -
  // Medusa's own order.placed event (and this page can load moments after
  // that) fires before some of completeCartWorkflow's later totals-aggregation
  // steps. Trust whichever is larger: Medusa's own total should only ever be
  // >= what's independently verifiable from the line items and shipping fee
  // (e.g. + tax), never less.
  const total = Math.max(toAmount(order.total), Math.max(0, itemsSubtotal + shipping - discount));
  const subtotal = Math.max(toAmount(order.subtotal), itemsSubtotal);
  const address = order.shipping_address;
  return {
    id: order.id,
    orderNumber: order.custom_display_id || String(order.display_id ?? order.id),
    status: order.status,
    paymentStatus: order.payment_status === "captured" || order.payment_status === "authorized" ? "paid" : order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    total,
    subtotal,
    shipping,
    currency: order.currency_code,
    placedAt: order.created_at instanceof Date ? order.created_at.toISOString() : String(order.created_at),
    email: order.email ?? "",
    phone: address?.phone ?? "",
    shippingAddress: {
      recipient: [address?.first_name, address?.last_name].filter(Boolean).join(" "),
      line1: address?.address_1,
      line2: address?.address_2,
      city: address?.city,
      province: address?.province,
      postalCode: address?.postal_code,
      countryCode: address?.country_code,
      phone: address?.phone,
    },
    itemsSummary: items.map((item) => item.title).join(", "),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

export async function listMedusaOrdersForCustomer(token: string): Promise<OrderDetail[]> {
  const { medusaSdk } = await import("./sdk");
  const { orders } = await medusaSdk.store.order.list(
    { fields: "+payment_status,+fulfillment_status,+custom_display_id,+subtotal,+shipping_total,+discount_total,*items,items.product_id,*shipping_address", limit: 50, order: "-created_at" },
    { Authorization: `Bearer ${token}` },
  );
  return orders.map(mapMedusaOrder);
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
    const { order } = await medusaSdk.store.order.retrieve(id, { fields: "+payment_status,+fulfillment_status,+custom_display_id,+subtotal,+shipping_total,+discount_total,*items,items.product_id,*shipping_address" });
    return mapMedusaOrder(order);
  } catch {
    return null;
  }
}
