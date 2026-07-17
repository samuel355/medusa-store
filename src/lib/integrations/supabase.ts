import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  return createBrowserClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render (cookies() is read-only there);
          // middleware refreshes the session cookie on the next request instead.
        }
      },
    },
  });
}

export function createServiceSupabaseClient() {
  return createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
