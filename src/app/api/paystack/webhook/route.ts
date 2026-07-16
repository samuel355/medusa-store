import { NextResponse } from "next/server";
import { enqueueOrderPaid } from "@/lib/integrations/queues";
import { verifyPaystackSignature } from "@/lib/integrations/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { metadata?: { orderId?: string; phone?: string } };
  };

  if (event.event === "charge.success" && event.data?.metadata?.orderId) {
    await enqueueOrderPaid(event.data.metadata.orderId, event.data.metadata.phone);
  }

  return NextResponse.json({ received: true });
}
