import { createClient } from "@supabase/supabase-js";
import { readEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  return createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function createServiceSupabaseClient() {
  return createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
