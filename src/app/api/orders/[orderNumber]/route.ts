import { NextResponse } from "next/server";
import { cancelOrder, getOrderByNumber } from "@/lib/db/orders";
import { resolveCustomerId } from "@/lib/auth/session";
import { getMedusaOrderById } from "@/lib/medusa/orders";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";

// No ownership check here by design, matching the "link-based lookup" comment
// in TrackingPageClient.tsx: the order ID itself is the capability (the
// confirmation/tracking pages pass Medusa's full order_<ulid> id, which has
// ~80 bits of randomness - not the short, human-facing display number). That
// mirrors how Stripe/Shopify guest order links work and lets a guest with no
// account view their own just-placed order. Don't "fix" this into requiring
// a session or the /api/orders/track contact check - that would break guest
// checkout confirmation. The rate limit below exists because the *legacy*
// fallback order number (generateOrderNumber in lib/db/orders.ts) has far
// less entropy than a Medusa ULID and shouldn't be brute-forceable even
// though guessing it in practice still requires the exact placement
// millisecond, not just a date.
export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const limit = rateLimit(`order-lookup:${clientIp(request)}`, { limit: 30, windowMs: 5 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber) ?? await getMedusaOrderById(orderNumber);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const customerId = await resolveCustomerId();

  if (!customerId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const order = await getOrderByNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const cancelled = await cancelOrder(order.id, customerId);
  if (!cancelled) {
    return NextResponse.json({ error: "This order can no longer be cancelled." }, { status: 400 });
  }

  return NextResponse.json({ cancelled: true });
}
