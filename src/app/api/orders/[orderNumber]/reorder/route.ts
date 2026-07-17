import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderByNumber, getOrderItemsForReorder } from "@/lib/db/orders";
import { addCartItem, getActiveCart } from "@/lib/db/cart";
import { resolveCustomerId } from "@/lib/auth/session";

export async function POST(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get("sobalshop_cart_id")?.value;
  const customerId = await resolveCustomerId();
  const resolvedCartId = await getActiveCart(cartId, customerId);

  const items = await getOrderItemsForReorder(order.id);
  for (const item of items) {
    if (item.variant_id) {
      await addCartItem(resolvedCartId, item.variant_id, item.quantity);
    }
  }

  cookieStore.set("sobalshop_cart_id", resolvedCartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ cartId: resolvedCartId, itemsAdded: items.length });
}
