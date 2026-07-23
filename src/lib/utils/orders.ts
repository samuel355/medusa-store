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
  items: { title: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

export const ORDERS_UPDATED_EVENT = "begnon:orders-updated";

export async function fetchOrders(): Promise<OrderSummary[]> {
  try {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { orders: OrderSummary[] };
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
