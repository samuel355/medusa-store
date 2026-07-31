/* Medusa 2.17.2 publishes these runtime exports but omits their declarations
 * from two generated barrel files. Keep the workaround local to this module. */
import type { AbstractNotificationProviderService as AbstractNotificationProviderServiceType } from "../../../node_modules/@medusajs/utils/dist/notification/abstract-notification-provider"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@medusajs/utils") as Record<string, unknown>

export const AbstractNotificationProviderService = runtime.AbstractNotificationProviderService as typeof AbstractNotificationProviderServiceType
export const ModuleProvider = runtime.ModuleProvider as (serviceName: string, config: { services: unknown[]; loaders?: unknown[] }) => unknown
