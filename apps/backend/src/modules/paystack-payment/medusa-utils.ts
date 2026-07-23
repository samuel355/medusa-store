/* Medusa 2.17.2 publishes these runtime exports but omits their declarations
 * from two generated barrel files. Keep the workaround local to this module. */
import type { AbstractPaymentProvider as AbstractPaymentProviderType } from "../../../node_modules/@medusajs/utils/dist/payment/abstract-payment-provider"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@medusajs/utils") as Record<string, unknown>

export const AbstractPaymentProvider = runtime.AbstractPaymentProvider as typeof AbstractPaymentProviderType
export const ModuleProvider = runtime.ModuleProvider as (serviceName: string, config: { services: unknown[]; loaders?: unknown[] }) => unknown
