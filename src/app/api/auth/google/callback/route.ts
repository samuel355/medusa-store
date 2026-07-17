import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_missing_code", url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }

  await ensureCustomerForAuthUser({
    authUserId: data.user.id,
    email: data.user.email,
    displayName: (data.user.user_metadata?.full_name as string | undefined) ?? (data.user.user_metadata?.name as string | undefined),
  });
  const admin = await isAdminAuthUser(data.user.id);
  const destination = redirectTo || (admin ? "/admin" : "/customers");

  return NextResponse.redirect(new URL(destination, url.origin));
}
