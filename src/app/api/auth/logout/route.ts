import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", new URL(request.url).origin));
}
