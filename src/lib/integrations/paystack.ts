import crypto from "node:crypto";
import { readEnv } from "@/lib/env";

async function paystackFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readEnv("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Paystack request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type PaystackInitializeInput = {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export async function initializePaystackTransaction(input: PaystackInitializeInput) {
  return paystackFetch<{
    status: boolean;
    message: string;
    data: { authorization_url: string; access_code: string; reference: string };
  }>("/transaction/initialize", {
    email: input.email,
    amount: input.amountPesewas,
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata
  });
}

export type GhanaMobileMoneyProvider = "mtn" | "atl" | "vod";

export type ChargeMobileMoneyInput = {
  email: string;
  amountPesewas: number;
  reference: string;
  phone: string;
  provider: GhanaMobileMoneyProvider;
  metadata?: Record<string, unknown>;
};

export type PaystackChargeResponse = {
  status: boolean;
  message: string;
  data: {
    status: "success" | "send_otp" | "send_pin" | "send_birthday" | "pay_offline" | "failed" | string;
    reference: string;
    display_text?: string;
    channel?: string;
  };
};

export async function chargeMobileMoney(input: ChargeMobileMoneyInput) {
  return paystackFetch<PaystackChargeResponse>("/charge", {
    email: input.email,
    amount: input.amountPesewas,
    currency: "GHS",
    reference: input.reference,
    mobile_money: {
      phone: input.phone,
      provider: input.provider
    },
    metadata: input.metadata
  });
}

export async function submitChargeOtp(input: { otp: string; reference: string }) {
  return paystackFetch<PaystackChargeResponse>("/charge/submit_otp", {
    otp: input.otp,
    reference: input.reference
  });
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha512", readEnv("PAYSTACK_SECRET_KEY"))
    .update(rawBody)
    .digest("hex");

  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
