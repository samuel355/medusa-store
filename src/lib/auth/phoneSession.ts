import { signInAsAuthUser } from "@/lib/auth/adminSession";

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

// Runs after our own OTP has already been verified (see phoneOtp.ts).
export async function signInWithVerifiedPhone(phone: string) {
  return signInAsAuthUser(syntheticEmailForPhone(phone));
}
