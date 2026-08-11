import crypto from "node:crypto";
import { readEnv } from "@/lib/env";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const OAUTH_STATE_COOKIE = "google_oauth_state";

type GoogleProfile = { email: string; name?: string; picture?: string; sub: string };

export function isSafeRedirect(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes(":");
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildGoogleAuthUrl(opts: { redirectUri: string; state: string }): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", readEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

// We - not Supabase's hosted broker - are now the OAuth client Google talks
// to directly, so this exchanges the auth code ourselves. That's also why
// the consent screen shows our own redirect_uri domain instead of a
// *.supabase.co one.
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: readEnv("GOOGLE_CLIENT_ID"),
      client_secret: readEnv("GOOGLE_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange failed: ${await tokenResponse.text()}`);
  }
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const userInfoResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error(`Google userinfo request failed: ${await userInfoResponse.text()}`);
  }

  const profile = (await userInfoResponse.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  // Never trust an unverified email for account linking/creation - it could
  // let someone sign in as another person's address without proving control.
  if (!profile.email || !profile.email_verified) {
    throw new Error("Google account has no verified email.");
  }

  return { email: profile.email, name: profile.name, picture: profile.picture, sub: profile.sub };
}
