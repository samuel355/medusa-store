import { Modules } from "@medusajs/utils"
import { ModuleProvider } from "./medusa-utils"
import PaystackPaymentService from "./service"

export default ModuleProvider(Modules.PAYMENT, { services: [PaystackPaymentService] })
