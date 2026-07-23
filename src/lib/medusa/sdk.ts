import MedusaImport from "@medusajs/js-sdk";

import { resolveMedusaConfig } from "./config";

export const medusaConfig = resolveMedusaConfig();

// The SDK publishes both ESM and CommonJS entry points. Some server-side TS
// loaders expose the CommonJS default one level deeper, while Next.js consumes
// the ESM default directly.
const Medusa =
  (MedusaImport as unknown as { default?: typeof MedusaImport }).default ??
  MedusaImport;

export const medusaSdk = new Medusa({
  baseUrl: medusaConfig.backendUrl,
  publishableKey: medusaConfig.publishableKey,
  debug: process.env.NODE_ENV === "development",
});
