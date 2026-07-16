import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/integrations/supabase";

export async function POST(request: Request) {
  const body = (await request.json()) as { redirectTo?: string };

  const { data, error } = await createServiceSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: body.redirectTo
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ url: data.url });
}
