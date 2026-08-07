// Set PLUGIN_STORE_URL in the environment (admin-bundler only exposes
// PLUGIN_-prefixed vars to this bundle, stripped down to STORE_URL here).
export function getStorefrontUrl(path = "") {
  const configured = process.env.STORE_URL;
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : configured || `${window.location.protocol}//${window.location.hostname}`;
  return `${base}${path}`;
}
