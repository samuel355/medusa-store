import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { sendNotifications } from "../lib/notify-helpers"
import { renderEmailShell } from "../lib/email-template"

type OrderCanceledEvent = { event: { data: { id: string } }; container: MedusaContainer }

export default async function orderCanceledHandler({ event, container }: OrderCanceledEvent) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "shipping_address.phone", "shipping_address.first_name"],
    filters: { id: event.data.id },
  })
  const order = orders[0]
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const orderRef = `#${order.display_id}`

  await sendNotifications(notificationService, logger, [
    order.shipping_address?.phone ? {
      to: order.shipping_address.phone,
      channel: "sms",
      template: "order-canceled-customer",
      data: { message: `Hi ${customerName}, your Begnon order ${orderRef} has been canceled. Contact us if this wasn't you.` },
    } : null,
    order.email ? {
      to: order.email,
      channel: "email",
      template: "order-canceled-customer",
      content: {
        subject: `Order canceled — ${orderRef}`,
        html: renderEmailShell({
          preheader: `Your Begnon order ${orderRef} has been canceled.`,
          heading: `Order ${orderRef} has been canceled.`,
          intro: `Hi ${customerName}, this order has been canceled and won't be charged or shipped. Contact us if this wasn't you.`,
        }),
      },
    } : null,
  ])
}

export const config = {
  event: "order.canceled",
}
