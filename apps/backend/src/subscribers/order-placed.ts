import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { money, sendNotifications } from "../lib/notify-helpers"

type OrderPlacedEvent = { event: { data: { id: string } }; container: MedusaContainer }

export default async function orderPlacedHandler({ event, container }: OrderPlacedEvent) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "currency_code", "total", "shipping_address.phone", "shipping_address.first_name"],
    filters: { id: event.data.id },
  })
  const order = orders[0]
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const total = money(order.total ?? 0, order.currency_code ?? "GHS")
  const orderRef = `#${order.display_id}`

  await sendNotifications(notificationService, logger, [
    order.shipping_address?.phone ? {
      to: order.shipping_address.phone,
      channel: "sms",
      template: "order-placed-customer",
      data: { message: `Hi ${customerName}, your Begnon order ${orderRef} for ${total} has been placed. We'll text you delivery updates.` },
    } : null,
    order.email ? {
      to: order.email,
      channel: "email",
      template: "order-placed-customer",
      content: {
        subject: `Order confirmed — ${orderRef}`,
        html: `<p>Hi ${customerName},</p><p>Your Begnon order ${orderRef} for <strong>${total}</strong> has been placed. We'll email you when it ships.</p>`,
      },
    } : null,
    process.env.PLATFORM_ADMIN_PHONE ? {
      to: process.env.PLATFORM_ADMIN_PHONE,
      channel: "sms",
      template: "order-placed-platform",
      data: { message: `New order ${orderRef} — ${total} from ${order.email ?? "a guest"}.` },
    } : null,
    process.env.PLATFORM_ADMIN_EMAIL ? {
      to: process.env.PLATFORM_ADMIN_EMAIL,
      channel: "email",
      template: "order-placed-platform",
      content: {
        subject: `New order ${orderRef} — ${total}`,
        html: `<p>New order ${orderRef} for <strong>${total}</strong> was placed by ${order.email ?? "a guest"}.</p>`,
      },
    } : null,
  ])
}

export const config = {
  event: "order.placed",
}
