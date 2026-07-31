import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { sendNotifications } from "../lib/notify-helpers"

type DeliveryCreatedEvent = { event: { data: { id: string; no_notification?: boolean } }; container: MedusaContainer }

export default async function deliveryCreatedHandler({ event, container }: DeliveryCreatedEvent) {
  if (event.data.no_notification) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id", "order.display_id", "order.email", "order.shipping_address.phone", "order.shipping_address.first_name"],
    filters: { id: event.data.id },
  })
  const order = fulfillments[0]?.order
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const orderRef = `#${order.display_id}`

  await sendNotifications(notificationService, logger, [
    order.shipping_address?.phone ? {
      to: order.shipping_address.phone,
      channel: "sms",
      template: "order-delivered-customer",
      data: { message: `Hi ${customerName}, your Begnon order ${orderRef} has been delivered. Enjoy!` },
    } : null,
    order.email ? {
      to: order.email,
      channel: "email",
      template: "order-delivered-customer",
      content: {
        subject: `Order delivered — ${orderRef}`,
        html: `<p>Hi ${customerName},</p><p>Your Begnon order ${orderRef} has been delivered. Enjoy!</p>`,
      },
    } : null,
  ])
}

export const config = {
  event: "delivery.created",
}
