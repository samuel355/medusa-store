export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Ghana mobile numbers: 0XXXXXXXXX (10 digits) or +233XXXXXXXXX.
export function isValidGhanaPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^(?:\+233\d{9}|0\d{9})$/.test(digits);
}

// Normalizes a valid Ghana number to E.164 (+233XXXXXXXXX). Callers must
// check isValidGhanaPhone first - this doesn't validate, only reformats.
export function normalizeGhanaPhone(value: string): string {
  const digits = value.replace(/[\s-]/g, "");
  return digits.startsWith("0") ? `+233${digits.slice(1)}` : digits;
}
