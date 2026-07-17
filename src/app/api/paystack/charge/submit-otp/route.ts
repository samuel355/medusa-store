import { NextResponse } from "next/server";
import { submitChargeOtp } from "@/lib/integrations/paystack";
import { markPaymentPaidIfPending } from "@/lib/db/payments";

export async function POST(request: Request) {
  const body = (await request.json()) as { otp?: string; reference?: string };

  if (!body.otp || !body.reference) {
    return NextResponse.json({ error: "OTP and reference are required." }, { status: 400 });
  }

  try {
    const result = await submitChargeOtp({ otp: body.otp, reference: body.reference });

    if (result.data.status === "success") {
      await markPaymentPaidIfPending(body.reference, "mobile_money");
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({
      status: result.data.status,
      message: result.data.display_text ?? "Waiting for confirmation.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify the OTP. Please try again." }, { status: 502 });
  }
}
