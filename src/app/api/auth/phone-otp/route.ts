import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/integrations/supabase";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };

  if (!body.phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const { error } = await createServiceSupabaseClient().auth.signInWithOtp({
    phone: body.phone
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}
