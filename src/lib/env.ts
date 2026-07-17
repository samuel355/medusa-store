type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "DATABASE_URL"
  | "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
  | "NEXT_PUBLIC_MEDUSA_ADMIN_URL"
  | "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_MEDUSA_REGION_ID"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "PAYSTACK_SECRET_KEY"
  | "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"
  | "ARKESEL_API_KEY"
  | "REDIS_URL"
  | "R2_ACCOUNT_ID"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET_NAME"
  | "R2_PUBLIC_URL";

export function readEnv(key: EnvKey, required = true) {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? "";
}
