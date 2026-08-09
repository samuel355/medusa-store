import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { sendNotifications } from "../lib/notify-helpers"
import { renderCtaButton, renderEmailShell } from "../lib/email-template"

type DeliveryCreatedEvent = { event: { data: { id: string; no_notification?: boolean } }; container: MedusaContainer }

export default async function deliveryCreatedHandler({ event, container }: DeliveryCreatedEvent) {
  if (event.data.no_notification) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id", "order.display_id", "order.custom_display_id", "order.email", "order.shipping_address.phone", "order.shipping_address.first_name"],
    filters: { id: event.data.id },
  })
  const order = fulfillments[0]?.order
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const orderRef = `#${order.custom_display_id ?? order.display_id}`
  const storeUrl = (process.env.PLUGIN_STORE_URL || "http://localhost:3000").replace(/\/$/, "")

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
        html: renderEmailShell({
          preheader: `Your Begnon order ${orderRef} has been delivered.`,
          heading: `Order ${orderRef} has been delivered.`,
          intro: `Hi ${customerName}, your order has arrived. We hope you love it!`,
          bodyHtml: renderCtaButton("View order", `${storeUrl}/tracking?order=${encodeURIComponent(order.id)}`),
        }),
      },
    } : null,
  ])
}

export const config = {
  event: "delivery.created",
}
