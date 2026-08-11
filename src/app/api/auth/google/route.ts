import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, generateOAuthState, isSafeRedirect, OAUTH_STATE_COOKIE } from "@/lib/auth/googleOAuth";

export async function POST(request: Request) {
  const body = (await request.json()) as { origin?: string; redirectTo?: string };
  const origin = body.origin ?? new URL(request.url).origin;
  const redirectUri = new URL("/api/auth/google/callback", origin).toString();
  const redirectTo = isSafeRedirect(body.redirectTo) ? body.redirectTo : undefined;

  const state = generateOAuthState();
  const url = buildGoogleAuthUrl({ redirectUri, state });

  const response = NextResponse.json({ url });
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, redirectTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
