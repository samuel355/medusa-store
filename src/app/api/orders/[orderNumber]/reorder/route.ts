import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderByNumber, getOrderItemsForReorder } from "@/lib/db/orders";
import { addCartItem, getActiveCart } from "@/lib/db/cart";
import { resolveCustomerId } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";

export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const limit = rateLimit(`order-reorder:${clientIp(request)}`, { limit: 20, windowMs: 5 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get("begnon_cart_id")?.value;
  const customerId = await resolveCustomerId();
  const resolvedCartId = await getActiveCart(cartId, customerId);

  const items = await getOrderItemsForReorder(order.id);
  for (const item of items) {
    if (item.variant_id) {
      await addCartItem(resolvedCartId, item.variant_id, item.quantity);
    }
  }

  cookieStore.set("begnon_cart_id", resolvedCartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ cartId: resolvedCartId, itemsAdded: items.length });
}
