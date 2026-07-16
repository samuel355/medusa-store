import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/integrations/supabase";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; mode?: "signup" | "login" };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const authCall =
    body.mode === "signup"
      ? supabase.auth.signUp({ email: body.email, password: body.password })
      : supabase.auth.signInWithPassword({ email: body.email, password: body.password });

  const { data, error } = await authCall;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
