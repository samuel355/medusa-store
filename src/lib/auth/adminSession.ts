import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/integrations/supabase";

// Finds or creates a Supabase auth user for this email via the admin API,
// sets a fresh one-time password, then signs in through the regular server
// client so real session cookies get written. Used whenever identity has
// already been verified out-of-band - phone OTP (phoneSession.ts) or a
// direct Google OAuth code exchange (googleOAuth.ts) - instead of through
// one of Supabase's own login providers.
export async function signInAsAuthUser(email: string, opts?: { userMetadata?: Record<string, unknown> }) {
  const sql = getSql();
  const [existing] = await sql<{ id: string }[]>`
    select id from auth.users where email = ${email} limit 1
  `;

  const service = createServiceSupabaseClient();
  const password = crypto.randomBytes(24).toString("hex");

  if (existing) {
    const { error } = await service.auth.admin.updateUserById(existing.id, {
      password,
      ...(opts?.userMetadata ? { user_metadata: opts.userMetadata } : {}),
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: opts?.userMetadata,
    });
    if (error) throw new Error(error.message);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "Unable to sign in.");

  return data.user;
}
