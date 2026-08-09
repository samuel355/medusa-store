import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { money, sendNotifications } from "../lib/notify-helpers"
import { renderCtaButton, renderEmailShell, renderItemsTable, renderOrderSummary } from "../lib/email-template"

type OrderPlacedEvent = { event: { data: { id: string } }; container: MedusaContainer }

export default async function orderPlacedHandler({ event, container }: OrderPlacedEvent) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "email", "currency_code", "total", "subtotal", "shipping_total",
      "shipping_address.phone", "shipping_address.first_name",
      "items.title", "items.quantity", "items.unit_price", "items.total", "items.thumbnail",
    ],
    filters: { id: event.data.id },
  })
  const order = orders[0]
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const currencyCode = order.currency_code ?? "GHS"
  const total = money(order.total ?? 0, currencyCode)
  const orderRef = `#${order.display_id}`
  const storeUrl = (process.env.PLUGIN_STORE_URL || "http://localhost:3000").replace(/\/$/, "")
  const items = (order.items ?? []).filter((item) => item !== null).map((item) => ({
    title: item.title ?? "Product",
    quantity: item.quantity ?? 1,
    unitPrice: item.unit_price ?? 0,
    total: item.total ?? 0,
    thumbnail: item.thumbnail,
  }))

  const customerEmailHtml = renderEmailShell({
    preheader: `Your Begnon order ${orderRef} for ${total} has been placed.`,
    heading: `Thanks, ${customerName}! Your order is confirmed.`,
    intro: `Order ${orderRef} has been placed. We'll email you again as soon as it ships.`,
    bodyHtml:
      renderItemsTable(items, currencyCode) +
      renderOrderSummary(
        { subtotal: order.subtotal ?? 0, shipping: order.shipping_total ?? 0, total: order.total ?? 0 },
        currencyCode,
      ) +
      renderCtaButton("Track your order", `${storeUrl}/tracking?order=${encodeURIComponent(orderRef)}`),
  })

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
        html: customerEmailHtml,
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
