import { NextResponse } from "next/server";
import { resolveCustomer } from "@/lib/auth/session";
import { getMedusaCustomerToken } from "@/lib/medusa/customerIdentity";
import { medusaSdk } from "@/lib/medusa/sdk";

// Best-effort: attaches a guest cart to the signed-in shopper's Medusa
// customer record so the order it completes into is later readable via
// /store/customers/me/orders. Never blocks checkout - a failure here just
// means the resulting order stays a guest order, same as before this existed.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { cartId?: string } | null;
  const cartId = body?.cartId;

  if (!cartId) {
    return NextResponse.json({ linked: false });
  }

  const customer = await resolveCustomer();
  if (!customer) {
    return NextResponse.json({ linked: false });
  }

  const token = await getMedusaCustomerToken(customer);
  if (!token) {
    return NextResponse.json({ linked: false });
  }

  try {
    await medusaSdk.store.cart.transferCart(cartId, {}, { Authorization: `Bearer ${token}` });
    return NextResponse.json({ linked: true });
  } catch (cause) {
    console.error("attach-cart-customer failed", cause);
    return NextResponse.json({ linked: false });
  }
}
