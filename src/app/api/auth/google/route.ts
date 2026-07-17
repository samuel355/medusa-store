import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";

export async function POST(request: Request) {
  const body = (await request.json()) as { origin?: string; redirectTo?: string };
  const origin = body.origin ?? new URL(request.url).origin;
  const callbackUrl = new URL("/api/auth/google/callback", origin);
  if (body.redirectTo) {
    callbackUrl.searchParams.set("redirectTo", body.redirectTo);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ url: data.url });
}
