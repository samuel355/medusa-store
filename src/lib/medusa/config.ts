const MEDUSA_ENV_KEYS = [
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_MEDUSA_REGION_ID",
] as const;

type MedusaEnvKey = (typeof MEDUSA_ENV_KEYS)[number];
type MedusaEnvironment = Readonly<Record<string, string | undefined>>;

export type MedusaStoreConfig = Readonly<{
  backendUrl: string;
  publishableKey: string;
  regionId: string;
}>;

export class MedusaConfigurationError extends Error {
  readonly key: MedusaEnvKey;

  constructor(key: MedusaEnvKey, message: string) {
    super(message);
    this.name = "MedusaConfigurationError";
    this.key = key;
  }
}

function requireValue(environment: MedusaEnvironment, key: MedusaEnvKey) {
  const value = environment[key]?.trim();

  if (!value) {
    throw new MedusaConfigurationError(
      key,
      `Missing required Medusa environment variable: ${key}`,
    );
  }

  return value;
}

function validateBackendUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch (cause) {
    throw new MedusaConfigurationError(
      "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
      `Invalid Medusa backend URL: ${String(cause)}`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MedusaConfigurationError(
      "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
      "Medusa backend URL must use http or https",
    );
  }

  return value.replace(/\/$/, "");
}

export function resolveMedusaConfig(
  environment: MedusaEnvironment = {
    // Keep these accesses static so Next.js can expose the same validated
    // configuration to browser bundles and server modules.
    NEXT_PUBLIC_MEDUSA_BACKEND_URL:
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    NEXT_PUBLIC_MEDUSA_REGION_ID: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
  },
): MedusaStoreConfig {
  return Object.freeze({
    backendUrl: validateBackendUrl(
      requireValue(environment, "NEXT_PUBLIC_MEDUSA_BACKEND_URL"),
    ),
    publishableKey: requireValue(
      environment,
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    ),
    regionId: requireValue(environment, "NEXT_PUBLIC_MEDUSA_REGION_ID"),
  });
}
