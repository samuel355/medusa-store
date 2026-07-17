import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; mode?: "signup" | "login" };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const authCall =
    body.mode === "signup"
      ? supabase.auth.signUp({ email: body.email, password: body.password })
      : supabase.auth.signInWithPassword({ email: body.email, password: body.password });

  const { data, error } = await authCall;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
  const admin = await isAdminAuthUser(data.user.id);

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    customer,
    redirectTo: admin ? "/admin" : "/customers",
  });
}
