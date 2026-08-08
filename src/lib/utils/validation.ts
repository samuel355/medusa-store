export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Ghana mobile numbers: 0XXXXXXXXX (10 digits) or +233XXXXXXXXX.
export function isValidGhanaPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^(?:\+233\d{9}|0\d{9})$/.test(digits);
}
