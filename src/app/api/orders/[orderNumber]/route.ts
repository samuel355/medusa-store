import { NextResponse } from "next/server";
import { cancelOrder, getOrderByNumber } from "@/lib/db/orders";
import { resolveCustomerId } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);

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
