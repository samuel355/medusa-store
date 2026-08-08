import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/integrations/supabase";

// Supabase gates ANY phone-identified sign-in (signInWithPassword({phone}),
// not just their own OTP flow) behind the project's "Phone" auth provider
// being enabled - a dashboard toggle we don't control and don't want to
// depend on, since phone verification here is entirely Arkesel/our own
// code (see phoneOtp.ts) and never touches Supabase's phone auth at all.
// So the Supabase user for a phone login is identified by a synthetic,
// never-shown, never-emailed address instead - Supabase only ever sees
// plain email+password, which needs no special project configuration.
function syntheticEmailForPhone(phone: string): string {
  return `phone-${phone}@phone-auth.begnon.internal`;
}

// Runs after our own OTP has already been verified (see phoneOtp.ts). Finds
// or creates the Supabase auth user for this phone's synthetic identity,
// sets a fresh one-time password on it via the admin API, then signs in
// with it through the regular server client so the real session cookies
// get written - the same path email/password login already uses.
export async function signInWithVerifiedPhone(phone: string) {
  const email = syntheticEmailForPhone(phone);
  const sql = getSql();
  const [existing] = await sql<{ id: string }[]>`
    select id from auth.users where email = ${email} limit 1
  `;

  const service = createServiceSupabaseClient();
  const password = crypto.randomBytes(24).toString("hex");

  if (existing) {
    const { error } = await service.auth.admin.updateUserById(existing.id, { password });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? "Unable to sign in.");

  return data.user;
}
