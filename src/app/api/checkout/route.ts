import { NextResponse } from "next/server";
import { createPendingOrder } from "@/lib/checkout/createPendingOrder";
import { createPaymentForOrder } from "@/lib/db/payments";
import { initializePaystackTransaction } from "@/lib/integrations/paystack";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    phone?: string;
    address?: string;
    callbackUrl?: string;
  };

  const result = await createPendingOrder({
    email: body.email ?? "",
    phone: body.phone,
    address: body.address,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { order, customerId } = result;

  try {
    const transaction = await initializePaystackTransaction({
      email: body.email!,
      amountPesewas: order.totalPesewas,
      reference: order.orderNumber,
      callbackUrl: body.callbackUrl ?? new URL("/confirmations", request.url).toString(),
      metadata: { orderId: order.id },
    });

    await createPaymentForOrder({
      orderId: order.id,
      customerId,
      reference: order.orderNumber,
      amountPesewas: order.totalPesewas,
      accessCode: transaction.data.access_code,
      authorizationUrl: transaction.data.authorization_url,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      accessCode: transaction.data.access_code,
      authorizationUrl: transaction.data.authorization_url,
    });
  } catch {
    await createPaymentForOrder({
      orderId: order.id,
      customerId,
      reference: order.orderNumber,
      amountPesewas: order.totalPesewas,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      accessCode: null,
      authorizationUrl: null,
      error: "Payment provider is unavailable. The order was recorded as payment pending.",
    });
  }
}
