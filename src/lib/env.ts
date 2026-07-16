type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "PAYSTACK_SECRET_KEY"
  | "PAYSTACK_WEBHOOK_SECRET"
  | "ARKESEL_API_KEY"
  | "REDIS_URL"
  | "R2_ACCOUNT_ID"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET"
  | "R2_PUBLIC_BASE_URL";

export function readEnv(key: EnvKey, required = true) {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? "";
}
