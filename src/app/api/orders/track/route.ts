import { NextResponse } from "next/server";
import { medusaSdk } from "@/lib/medusa/sdk";
import { mapMedusaOrder } from "@/lib/medusa/orders";
import type { HttpTypes } from "@medusajs/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { orderNumber?: string; contact?: string } | null;
  const orderNumber = body?.orderNumber?.trim();
  const contact = body?.contact?.trim();

  if (!orderNumber || !contact) {
    return NextResponse.json({ error: "Order number and contact are required." }, { status: 400 });
  }

  try {
    const { order } = await medusaSdk.client.fetch<{ order: HttpTypes.StoreOrder }>("/store/order-lookup", {
      method: "POST",
      body: { orderNumber, contact },
    });
    return NextResponse.json({ order: mapMedusaOrder(order) });
  } catch (cause) {
    const status = (cause as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: "No matching order found." }, { status: 404 });
  }
}
