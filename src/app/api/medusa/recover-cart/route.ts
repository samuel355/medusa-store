import { NextResponse } from "next/server";
import { resolveCustomer } from "@/lib/auth/session";
import { getMedusaCustomerToken } from "@/lib/medusa/customerIdentity";
import { medusaSdk } from "@/lib/medusa/sdk";

// Best-effort: looks up the signed-in customer's most recent open Medusa
// cart (from an earlier sign-in, possibly on a different device) so this
// device can recover/merge it - see CartProvider's post-sign-in sync effect,
// the caller of this route. A failure here just leaves the caller on its own
// local cart, same as before this existed.
export async function GET() {
  const customer = await resolveCustomer();
  if (!customer) {
    return NextResponse.json({ cartId: null });
  }

  const token = await getMedusaCustomerToken(customer);
  if (!token) {
    return NextResponse.json({ cartId: null });
  }

  try {
    const { cartId } = await medusaSdk.client.fetch<{ cartId: string | null }>("/store/customers/me/active-cart", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json({ cartId });
  } catch (cause) {
    console.error("recover-cart failed", cause);
    return NextResponse.json({ cartId: null });
  }
}
