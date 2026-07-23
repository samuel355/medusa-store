// Next.js only inlines a NEXT_PUBLIC_* variable into client bundles when it sees this
// literal `process.env.NEXT_PUBLIC_...` expression in the source. Capturing it here,
// instead of reading it off an indirect `environment` parameter, is required for the
// flag to resolve correctly in the browser (not just on the server).
const inlinedCartFlag = process.env.NEXT_PUBLIC_MEDUSA_CART_ENABLED;

export function isMedusaCartEnabled(environment?: Readonly<Record<string, string | undefined>>) {
  const value = environment ? environment.NEXT_PUBLIC_MEDUSA_CART_ENABLED : inlinedCartFlag;
  return value?.trim().toLowerCase() === "true";
}
