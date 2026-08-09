export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  placedAt: string;
  itemsSummary: string;
  itemCount: number;
};

export type OrderDetail = OrderSummary & {
  email: string;
  phone: string;
  shippingAddress: Record<string, unknown>;
  subtotal: number;
  shipping: number;
  items: { id: string; productId: string | null; title: string; sku: string; variantId: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
};

export const ORDERS_UPDATED_EVENT = "begnon:orders-updated";

// /api/orders returns full order detail (Medusa order data, including line
// items with variant IDs) for every order, not just summary fields - callers
// that only need summary fields can still use OrderDetail as an OrderSummary.
export async function fetchOrders(): Promise<OrderDetail[]> {
  try {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { orders: OrderDetail[] };
    return data.orders;
  } catch {
    return [];
  }
}

export async function fetchOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { order: OrderDetail };
    return data.order;
  } catch {
    return null;
  }
}

// For the manual "type it in" tracking search box, not link-based lookups
// (order number alone isn't a big enough secret - see /api/orders/track).
export async function trackOrder(orderNumber: string, contact: string): Promise<{ order: OrderDetail | null; error: string | null }> {
  try {
    const response = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, contact }),
    });
    const data = (await response.json()) as { order?: OrderDetail; error?: string };
    if (!response.ok) return { order: null, error: data.error ?? "No matching order found." };
    return { order: data.order ?? null, error: null };
  } catch {
    return { order: null, error: "Something went wrong. Please try again." };
  }
}

export async function cancelOrder(orderNumber: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function reorder(orderNumber: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/reorder`, { method: "POST" });
    if (response.ok) {
      window.dispatchEvent(new CustomEvent("begnon:cart-updated"));
    }
    return response.ok;
  } catch {
    return false;
  }
}
