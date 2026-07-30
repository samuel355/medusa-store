// Set PLUGIN_STOREFRONT_URL in the environment (admin-bundler only exposes
// PLUGIN_-prefixed vars to this bundle, as STOREFRONT_URL).
export function getStorefrontUrl(path = "") {
  const configured = process.env.STOREFRONT_URL;
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : configured || `${window.location.protocol}//${window.location.hostname}`;
  return `${base}${path}`;
}
