import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { isAdminAuthUser } from "@/lib/db/customers";
import { readEnv } from "@/lib/env";

export default async function AdminPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdminAuthUser(user.id);
  if (!admin) redirect("/customers");

  redirect(readEnv("NEXT_PUBLIC_MEDUSA_ADMIN_URL"));
}
