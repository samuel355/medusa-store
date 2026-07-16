import { NextResponse } from "next/server";
import { initializePaystackTransaction } from "@/lib/integrations/paystack";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    amountPesewas?: number;
    reference?: string;
    callbackUrl?: string;
    orderId?: string;
  };

  if (!body.email || !body.amountPesewas || !body.reference || !body.callbackUrl) {
    return NextResponse.json({ error: "Missing checkout payment fields." }, { status: 400 });
  }

  const transaction = await initializePaystackTransaction({
    email: body.email,
    amountPesewas: body.amountPesewas,
    reference: body.reference,
    callbackUrl: body.callbackUrl,
    metadata: { orderId: body.orderId }
  });

  return NextResponse.json(transaction.data);
}
