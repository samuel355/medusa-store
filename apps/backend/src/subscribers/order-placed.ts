import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { money, sendNotifications, toAmount } from "../lib/notify-helpers"
import { renderCtaButton, renderEmailShell, renderItemsTable, renderOrderSummary } from "../lib/email-template"
import { ensureOrderNumber } from "../lib/order-number"

type OrderPlacedEvent = { event: { data: { id: string } }; container: MedusaContainer }

export default async function orderPlacedHandler({ event, container }: OrderPlacedEvent) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "custom_display_id", "email", "currency_code", "total", "subtotal", "shipping_total", "discount_total",
      "shipping_address.phone", "shipping_address.first_name",
      "items.title", "items.quantity", "items.unit_price", "items.total", "items.thumbnail",
    ],
    filters: { id: event.data.id },
  })
  const order = orders[0]
  if (!order) return

  const customerName = order.shipping_address?.first_name || "there"
  const currencyCode = order.currency_code ?? "GHS"
  // completeCartWorkflow emits order.placed *before* the orderCreated hook
  // that normally sets custom_display_id (see order-number.ts) - without
  // this, the SMS/email would race that hook and usually lose, showing
  // Medusa's raw numeric display_id instead of the alphanumeric order number
  // customers are meant to track with. ensureOrderNumber generates it here
  // if it isn't set yet, idempotently.
  const orderNumber = await ensureOrderNumber(order.id, container).catch(() => order.custom_display_id ?? null)
  const orderRef = `#${orderNumber ?? order.display_id}`
  const storeUrl = (process.env.PLUGIN_STORE_URL || "http://localhost:3000").replace(/\/$/, "")
  const adminName = (process.env.PLATFORM_ADMIN_NAME || "Admin").trim()
  const items = (order.items ?? []).filter((item) => item !== null).map((item) => {
    const quantity = toAmount(item.quantity, 1) || 1
    const unitPrice = toAmount(item.unit_price)
    // Some Medusa query paths populate unit_price but not the line's total
    // (or vice versa) - derive whichever is missing from the other instead
    // of letting it fall back to a bare 0.
    const lineTotal = toAmount(item.total, unitPrice * quantity) || unitPrice * quantity
    return {
      title: item.title ?? "Product",
      quantity,
      unitPrice,
      total: lineTotal,
      thumbnail: item.thumbnail,
    }
  })

  const itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0)
  const shipping = toAmount(order.shipping_total)
  const discount = toAmount(order.discount_total)
  // order.total (and order.subtotal) can still be mid-computation this early
  // in completeCartWorkflow - order.placed fires before the workflow's later
  // totals-aggregation steps, and a stale/partial total (observed: exactly
  // the shipping fee, as if items hadn't been folded in yet) undercharges
  // what the customer/admin are told they got. Trust whichever is larger:
  // Medusa's own total should only ever be >= what's independently verifiable
  // from the line items and shipping fee (e.g. + tax), never less.
  const orderTotal = Math.max(toAmount(order.total), Math.max(0, itemsSubtotal + shipping - discount))
  const subtotal = Math.max(toAmount(order.subtotal), itemsSubtotal)
  const total = money(orderTotal, currencyCode)

  const customerEmailHtml = renderEmailShell({
    preheader: `Your Begnon order ${orderRef} for ${total} has been placed.`,
    heading: `Thanks, ${customerName}! Your order is confirmed.`,
    intro: `Order ${orderRef} has been placed. We'll email you again as soon as it ships.`,
    bodyHtml:
      renderItemsTable(items, currencyCode) +
      renderOrderSummary({ subtotal, shipping, total: orderTotal }, currencyCode) +
      renderCtaButton("Track your order", `${storeUrl}/tracking?order=${encodeURIComponent(order.id)}`),
  })

  const adminEmailHtml = renderEmailShell({
    preheader: `${customerName} just placed order ${orderRef} for ${total}.`,
    heading: `New order from ${customerName}! 🎉`,
    intro: `Order ${orderRef} worth ${total} just came in. Here's the quick view — open the dashboard for fulfillment and payment details.`,
    bodyHtml:
      renderItemsTable(items, currencyCode) +
      renderOrderSummary({ subtotal, shipping, total: orderTotal }, currencyCode) +
      renderCtaButton("Open dashboard", `${storeUrl}/admin`),
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
      data: { message: `Hello Admin ${adminName}! ${customerName} just placed order ${orderRef} worth ${total} on Begnon. Check the dashboard for full details.` },
    } : null,
    process.env.PLATFORM_ADMIN_EMAIL ? {
      to: process.env.PLATFORM_ADMIN_EMAIL,
      channel: "email",
      template: "order-placed-platform",
      content: {
        subject: `🎉 New order ${orderRef} — ${total}`,
        html: adminEmailHtml,
      },
    } : null,
  ])
}

export const config = {
  event: "order.placed",
}
