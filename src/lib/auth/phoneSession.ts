import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/integrations/supabase";

// Runs after our own OTP has already been verified (see phoneOtp.ts). Finds
// or creates the Supabase auth user for this phone, sets a fresh one-time
// password on it via the admin API, then signs in with it through the
// regular server client so the real session cookies get written - the same
// path email/password login already uses.
export async function signInWithVerifiedPhone(phone: string) {
  const sql = getSql();
  const [existing] = await sql<{ id: string }[]>`
    select id from auth.users where phone = ${phone} limit 1
  `;

  const service = createServiceSupabaseClient();
  const password = crypto.randomBytes(24).toString("hex");

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await service.auth.admin.createUser({ phone, phone_confirm: true, password });
    if (error || !data.user) throw new Error(error?.message ?? "Unable to create the phone account.");
    userId = data.user.id;
  } else {
    const { error } = await service.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(error.message);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error || !data.user) throw new Error(error?.message ?? "Unable to sign in.");

  return data.user;
}
