import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; token?: string; step?: "send" | "verify" };

  if (!body.phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  if (body.step === "verify") {
    if (!body.token) {
      return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: body.phone,
      token: body.token,
      type: "sms",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Verification did not return a user." }, { status: 400 });
    }

    const customer = await ensureCustomerForAuthUser({
      authUserId: data.user.id,
      phone: data.user.phone,
    });
    const admin = await isAdminAuthUser(data.user.id);

    return NextResponse.json({
      user: { id: data.user.id, phone: data.user.phone },
      customer,
      redirectTo: admin ? "/admin" : "/customers",
    });
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: body.phone });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}
