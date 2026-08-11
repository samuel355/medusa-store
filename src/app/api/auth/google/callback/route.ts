import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureCustomerForAuthUser, isAdminAuthUser } from "@/lib/db/customers";
import { ensureMedusaCustomerLink } from "@/lib/medusa/customerIdentity";
import { signInAsAuthUser } from "@/lib/auth/adminSession";
import { exchangeGoogleCode, isSafeRedirect, OAUTH_STATE_COOKIE } from "@/lib/auth/googleOAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !stateParam || !raw) {
    return NextResponse.redirect(new URL("/login?error=oauth_missing_code", url.origin));
  }

  let saved: { state?: string; redirectTo?: string };
  try {
    saved = JSON.parse(raw) as { state?: string; redirectTo?: string };
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }

  if (!saved.state || saved.state !== stateParam) {
    return NextResponse.redirect(new URL("/login?error=oauth_state_mismatch", url.origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", url.origin).toString();

  try {
    const profile = await exchangeGoogleCode(code, redirectUri);
    const user = await signInAsAuthUser(profile.email, {
      userMetadata: { full_name: profile.name, avatar_url: profile.picture, provider: "google" },
    });

    const customer = await ensureCustomerForAuthUser({
      authUserId: user.id,
      email: user.email,
      displayName: profile.name,
    });
    await ensureMedusaCustomerLink(customer).catch(() => null);
    const admin = await isAdminAuthUser(user.id);
    const destination = isSafeRedirect(saved.redirectTo) ? saved.redirectTo : admin ? "/admin" : "/customers";

    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (cause) {
    console.error("Google OAuth callback failed", cause);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }
}
