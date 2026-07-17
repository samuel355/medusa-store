import { NextResponse } from "next/server";
import { enqueueOrderPaid } from "@/lib/integrations/queues";
import { verifyPaystackSignature } from "@/lib/integrations/paystack";
import { markPaymentPaidIfPending, logPaystackEvent } from "@/lib/db/payments";
import { getOrderById } from "@/lib/db/orders";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: { reference?: string; channel?: string; metadata?: { orderId?: string } };
  };

  const reference = event.data?.reference;

  if (event.event === "charge.success" && reference) {
    const payment = await markPaymentPaidIfPending(reference, event.data?.channel);

    await logPaystackEvent({
      event: event.event,
      reference,
      orderId: payment?.order_id ?? event.data?.metadata?.orderId,
      payload: event,
    });

    if (payment?.order_id) {
      const order = await getOrderById(payment.order_id);
      await enqueueOrderPaid(payment.order_id, order?.phone || undefined);
    }
  }

  return NextResponse.json({ received: true });
}
