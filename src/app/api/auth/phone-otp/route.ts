import { NextResponse } from "next/server";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/auth/phoneOtp";
import { signInWithVerifiedPhone } from "@/lib/auth/phoneSession";
import { isValidGhanaPhone, normalizeGhanaPhone } from "@/lib/utils/validation";
import { ensureMedusaCustomerLink } from "@/lib/medusa/customerIdentity";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; token?: string; step?: "send" | "verify" };

  if (!body.phone || !isValidGhanaPhone(body.phone)) {
    return NextResponse.json({ error: "A valid Ghana phone number is required." }, { status: 400 });
  }
  const phone = normalizeGhanaPhone(body.phone);
  const ip = clientIp(request);

  if (body.step === "verify") {
    if (!body.token) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    // Per-phone attempt cap already lives in verifyPhoneOtp; this adds a
    // per-IP cap so one attacker can't brute-force codes across many
    // different phone numbers (or spin up new phone rows to dodge the
    // per-phone limit) from a single source.
    const verifyLimit = rateLimit(`phone-otp:verify:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 });
    if (!verifyLimit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const verified = await verifyPhoneOtp(phone, body.token.trim());
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    try {
      const user = await signInWithVerifiedPhone(phone);
      const customer = await ensureCustomerForAuthUser({ authUserId: user.id, phone, trustedPhone: phone });
      await ensureMedusaCustomerLink(customer).catch(() => null);
      const admin = await isAdminAuthUser(user.id);

      return NextResponse.json({
        user: { id: user.id, phone },
        customer,
        redirectTo: admin ? "/admin" : "/customers",
      });
    } catch (cause) {
      return NextResponse.json(
        { error: cause instanceof Error ? cause.message : "Unable to sign in." },
        { status: 400 },
      );
    }
  }

  // The per-phone 60s cooldown in sendPhoneOtp doesn't stop one source from
  // cycling through many different numbers to run up Arkesel SMS spend, so
  // this caps SMS sends per IP too.
  const sendLimit = rateLimit(`phone-otp:send:${ip}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!sendLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const sent = await sendPhoneOtp(phone);
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}
