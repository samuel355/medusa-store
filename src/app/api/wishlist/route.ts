import { NextResponse } from "next/server";
import { getWishlist, toggleWishlistItem } from "@/lib/db/wishlists";
import { resolveCustomerId } from "@/lib/auth/session";

export async function GET() {
  const customerId = await resolveCustomerId();
  if (!customerId) {
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ items: await getWishlist(customerId) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { productId?: string };
  if (!body.productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  const customerId = await resolveCustomerId();
  if (!customerId) {
    return NextResponse.json({ requiresAuth: true }, { status: 401 });
  }

  const result = await toggleWishlistItem(customerId, body.productId);
  return NextResponse.json(result);
}
