export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Ghana mobile numbers: 0XXXXXXXXX (10 digits) or +233XXXXXXXXX.
export function isValidGhanaPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^(?:\+233\d{9}|0\d{9})$/.test(digits);
}

// Normalizes a valid Ghana number to 233XXXXXXXXX, deliberately without a
// leading "+" - Supabase's admin API strips it before storing auth.users.phone
// regardless of what's passed in, so any code that later does a raw SQL
// lookup against that column (rather than going through the Supabase client,
// which normalizes internally) must match its exact stored format or the
// lookup silently never finds the row. Callers must check isValidGhanaPhone
// first - this doesn't validate, only reformats.
export function normalizeGhanaPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+/, "");
  return digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
}
