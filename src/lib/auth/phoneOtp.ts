import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { sendSms } from "@/lib/integrations/arkesel";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type Result = { ok: true } | { ok: false; error: string };

function hashCode(phone: string, code: string): string {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Supabase's own phone provider only supports Twilio/MessageBird/Vonage/
// TextLocal, not Arkesel - so OTPs are generated, hashed, and verified here,
// and Supabase is only used afterwards to mint the actual session.
export async function sendPhoneOtp(phone: string): Promise<Result> {
  const sql = getSql();
  const [existing] = await sql<{ created_at: Date }[]>`
    select created_at from medusastore.phone_otp_codes where phone = ${phone}
  `;
  if (existing && Date.now() - new Date(existing.created_at).getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Please wait a minute before requesting another code." };
  }

  const code = generateCode();
  const codeHash = hashCode(phone, code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await sql`
    insert into medusastore.phone_otp_codes (phone, code_hash, expires_at, attempts, created_at)
    values (${phone}, ${codeHash}, ${expiresAt}, 0, now())
    on conflict (phone) do update set
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      created_at = excluded.created_at
  `;

  try {
    await sendSms({ to: phone, message: `Your Begnon verification code is ${code}. It expires in 10 minutes.` });
  } catch {
    await sql`delete from medusastore.phone_otp_codes where phone = ${phone}`;
    return { ok: false, error: "Unable to send the verification code. Please try again." };
  }

  return { ok: true };
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<Result> {
  const sql = getSql();
  const [row] = await sql<{ code_hash: string; expires_at: Date; attempts: number }[]>`
    select code_hash, expires_at, attempts from medusastore.phone_otp_codes where phone = ${phone}
  `;

  if (!row) return { ok: false, error: "Request a new code first." };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql`delete from medusastore.phone_otp_codes where phone = ${phone}`;
    return { ok: false, error: "That code has expired. Request a new one." };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await sql`delete from medusastore.phone_otp_codes where phone = ${phone}`;
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }

  if (hashCode(phone, code) !== row.code_hash) {
    await sql`update medusastore.phone_otp_codes set attempts = attempts + 1 where phone = ${phone}`;
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  await sql`delete from medusastore.phone_otp_codes where phone = ${phone}`;
  return { ok: true };
}
