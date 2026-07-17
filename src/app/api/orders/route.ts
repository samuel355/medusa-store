import { NextResponse } from "next/server";
import { getOrdersForCustomer } from "@/lib/db/orders";
import { resolveCustomerId } from "@/lib/auth/session";

export async function GET() {
  const customerId = await resolveCustomerId();
  if (!customerId) {
    return NextResponse.json({ orders: [] });
  }

  return NextResponse.json({ orders: await getOrdersForCustomer(customerId) });
}
