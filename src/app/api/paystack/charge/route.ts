import { NextResponse } from "next/server";
import { createPendingOrder } from "@/lib/checkout/createPendingOrder";
import { createPaymentForOrder, markPaymentPaidIfPending } from "@/lib/db/payments";
import { chargeMobileMoney, type GhanaMobileMoneyProvider } from "@/lib/integrations/paystack";

const VALID_PROVIDERS: GhanaMobileMoneyProvider[] = ["mtn", "atl", "vod"];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    phone?: string;
    address?: string;
    momoPhone?: string;
    provider?: string;
  };

  if (!body.momoPhone || !body.provider || !VALID_PROVIDERS.includes(body.provider as GhanaMobileMoneyProvider)) {
    return NextResponse.json({ error: "A valid mobile money number and network are required." }, { status: 400 });
  }

  const result = await createPendingOrder({
    email: body.email ?? "",
    phone: body.phone,
    address: body.address,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { order, customerId } = result;

  await createPaymentForOrder({
    orderId: order.id,
    customerId,
    reference: order.orderNumber,
    amountPesewas: order.totalPesewas,
  });

  try {
    const charge = await chargeMobileMoney({
      email: body.email!,
      amountPesewas: order.totalPesewas,
      reference: order.orderNumber,
      phone: body.momoPhone,
      provider: body.provider as GhanaMobileMoneyProvider,
      metadata: { orderId: order.id },
    });

    if (charge.data.status === "success") {
      await markPaymentPaidIfPending(order.orderNumber, "mobile_money");
      return NextResponse.json({ status: "success", orderNumber: order.orderNumber });
    }

    if (charge.data.status === "send_otp") {
      return NextResponse.json({
        status: "send_otp",
        orderNumber: order.orderNumber,
        reference: charge.data.reference,
        message: charge.data.display_text ?? "Enter the OTP sent to your phone.",
      });
    }

    return NextResponse.json({
      status: "pending",
      orderNumber: order.orderNumber,
      reference: charge.data.reference,
      message: charge.data.display_text ?? "Approve the payment prompt on your phone to finish.",
    });
  } catch {
    return NextResponse.json(
      { status: "failed", orderNumber: order.orderNumber, error: "Mobile money charge failed. Please try again." },
      { status: 502 },
    );
  }
}
