import { Modules } from "@medusajs/utils"
import { ModuleProvider } from "./medusa-utils"
import ArkeselNotificationService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, { services: [ArkeselNotificationService] })
