import { Modules } from "@medusajs/utils"
import { ModuleProvider } from "./medusa-utils"
import ResendNotificationService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, { services: [ResendNotificationService] })
