import { cookies } from "next/headers";
import { getActiveCart, getCartWithItems } from "@/lib/db/cart";
import { createOrderFromCart } from "@/lib/db/orders";
import { resolveCustomerId } from "@/lib/auth/session";

export type CreatePendingOrderInput = {
  email: string;
  phone?: string;
  address?: string;
};

export type CreatePendingOrderResult =
  | {
      ok: true;
      order: { id: string; orderNumber: string; totalPesewas: number };
      customerId?: string;
    }
  | { ok: false; error: string; status: number };

export async function createPendingOrder(input: CreatePendingOrderInput): Promise<CreatePendingOrderResult> {
  if (!input.email) {
    return { ok: false, error: "Email is required.", status: 400 };
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get("sobalshop_cart_id")?.value;
  const customerId = await resolveCustomerId();

  if (!cartId) {
    return { ok: false, error: "Cart is empty.", status: 400 };
  }

  const resolvedCartId = await getActiveCart(cartId, customerId);
  const cart = await getCartWithItems(resolvedCartId);

  if (cart.items.length === 0) {
    return { ok: false, error: "Cart is empty.", status: 400 };
  }

  const order = await createOrderFromCart(cart, {
    customerId,
    email: input.email,
    phone: input.phone,
    shippingAddress: input.address ? { line1: input.address } : undefined,
  });

  return { ok: true, order, customerId };
}
