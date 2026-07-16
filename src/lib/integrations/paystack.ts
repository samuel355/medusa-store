import crypto from "node:crypto";
import { readEnv } from "@/lib/env";

export type PaystackInitializeInput = {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export async function initializePaystackTransaction(input: PaystackInitializeInput) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readEnv("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata
    })
  });

  if (!response.ok) {
    throw new Error(`Paystack initialize failed with status ${response.status}`);
  }

  return response.json() as Promise<{
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  }>;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha512", readEnv("PAYSTACK_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
