import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { isAdminAuthUser } from "@/lib/db/customers";
import { StoreHeaderClient } from "@/components/store/StoreHeaderClient";

export async function StoreHeader() {
  let isSignedIn = false;
  let isAdmin = false;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    isSignedIn = Boolean(user);
    isAdmin = user ? await isAdminAuthUser(user.id) : false;
  }

  const accountHref = isSignedIn ? (isAdmin ? "/admin" : "/customers") : "/login";

  return <StoreHeaderClient isSignedIn={isSignedIn} isAdmin={isAdmin} accountHref={accountHref} />;
}
