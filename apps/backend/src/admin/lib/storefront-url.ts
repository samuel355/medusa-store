// The admin bundle only receives env vars prefixed PLUGIN_ at build time
// (@medusajs/admin-bundler strips the prefix into process.env). Set
// PLUGIN_STOREFRONT_URL in the backend's environment so these links point at
// the deployed storefront instead of guessing it lives on the same host.
export function getStorefrontUrl(path = "") {
  const configured = process.env.STOREFRONT_URL;
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : configured || `${window.location.protocol}//${window.location.hostname}`;
  return `${base}${path}`;
}
