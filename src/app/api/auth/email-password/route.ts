import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";
import { ensureMedusaCustomerLink } from "@/lib/medusa/customerIdentity";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; mode?: "signup" | "login" };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Guards against credential-stuffing/brute-force: per-IP, not per-email, so
  // it can't be used to lock a victim out of their own account.
  const limit = rateLimit(`email-password:${clientIp(request)}`, { limit: 15, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const authCall =
    body.mode === "signup"
      ? supabase.auth.signUp({ email: body.email, password: body.password })
      : supabase.auth.signInWithPassword({ email: body.email, password: body.password });

  const { data, error } = await authCall;

  if (error) {
    return NextResponse.json(
      { error: error.message, emailNotConfirmed: error.code === "email_not_confirmed" },
      { status: 400 },
    );
  }

  if (!data.user) {
    return NextResponse.json({
      pendingConfirmation: true,
      message: "Check your email to confirm your account before signing in.",
    });
  }

  const customer = await ensureCustomerForAuthUser({
    authUserId: data.user.id,
    email: data.user.email,
  });
  await ensureMedusaCustomerLink(customer).catch(() => null);
  const admin = await isAdminAuthUser(data.user.id);

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    customer,
    redirectTo: admin ? "/admin" : "/customers",
  });
}
