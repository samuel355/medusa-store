import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { getCustomerByAuthUserId, isAdminAuthUser as isAdminAuthUserId } from "@/lib/db/customers";

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getAuthUser() {
  if (!supabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function resolveCustomerId(): Promise<string | undefined> {
  const user = await getAuthUser();
  if (!user) return undefined;

  const customer = await getCustomerByAuthUserId(user.id);
  return customer?.id;
}

export async function requireCustomerId(): Promise<string> {
  const customerId = await resolveCustomerId();
  if (!customerId) throw new Error("Not signed in.");
  return customerId;
}

export async function isAdminAuthUser(authUserId: string): Promise<boolean> {
  return isAdminAuthUserId(authUserId);
}
