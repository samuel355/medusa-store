import { NextResponse } from "next/server";
import { getOrderByNumber, updateOrderStatus } from "@/lib/db/orders";
import { getAuthUser, isAdminAuthUser } from "@/lib/auth/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getAuthUser();
  if (!user || !(await isAdminAuthUser(user.id))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const body = (await request.json()) as { status?: string; fulfillmentStatus?: string };
  await updateOrderStatus(order.id, body);

  return NextResponse.json({ order: await getOrderByNumber(orderNumber) });
}
