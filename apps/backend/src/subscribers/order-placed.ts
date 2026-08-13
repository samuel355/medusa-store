import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { money, sendNotifications, toAmount } from "../lib/notify-helpers"
import { renderCtaButton, renderEmailShell, renderItemsTable, renderOrderSummary } from "../lib/email-template"
import { ensureOrderNumber } from "../lib/order-number"

type OrderPlacedEvent = { event: { data: { id: string } }; container: MedusaContainer }

const ORDER_FIELDS = [
  "id", "display_id", "custom_display_id", "email", "currency_code", "total", "subtotal", "shipping_total", "discount_total",
  "shipping_address.phone", "shipping_address.first_name",
  "items.title", "items.quantity", "items.unit_price", "items.total", "items.thumbnail",
]

function deriveItems(order: { items?: Array<Record<string, unknown> | null> | null }) {
  return (order.items ?? []).filter((item): item is Record<string, unknown> => item !== null).map((item) => {
    const quantity = toAmount(item.quantity, 1) || 1
    const unitPrice = toAmount(item.unit_price)
    // Some Medusa query paths populate unit_price but not the line's total
    // (or vice versa) - derive whichever is missing from the other instead
    // of letting it fall back to a bare 0.
    const lineTotal = toAmount(item.total, unitPrice * quantity) || unitPrice * quantity
    return {
      title: (item.title as string | undefined) ?? "Product",
      quantity,
      unitPrice,
      total: lineTotal,
      thumbnail: item.thumbnail as string | undefined,
    }
  })
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default async function orderPlacedHandler({ event, container }: OrderPlacedEvent) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const fetchOrder = async () => {
    const { data: orders } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: event.data.id } })
    return orders[0]
  }

  let order = await fetchOrder()
  if (!order) return
  let items = deriveItems(order)
  let itemsSubtotal = items.reduce((sum, item) => sum + item.total, 0)

  // completeCartWorkflow emits order.placed *before* its later totals- and
  // item-aggregation steps finish - a read this early can catch line items
  // whose quantity hasn't been written yet (observed live: a quantity-2 item
  // read back as quantity 1, undercounting the SMS/email total by exactly
  // that item's unit price). Re-read until two consecutive reads agree on
  // the item subtotal, so the notification only ever goes out once the
  // order has stopped changing underneath us, not on a fixed guessed delay.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(1500)
    const next = await fetchOrder()
    if (!next) break
    const nextItems = deriveItems(next)
    const nextSubtotal = nextItems.reduce((sum, item) => sum + item.total, 0)
    const stable = nextSubtotal === itemsSubtotal && nextItems.length === items.length
    order = next
    items = nextItems
    itemsSubtotal = nextSubtotal
    if (stable) break
  }

  const customerName = order.shipping_address?.first_name || "there"
  const currencyCode = order.currency_code ?? "GHS"
  // Same early-read race as above can also leave custom_display_id unset -
  // ensureOrderNumber generates it here idempotently if it still isn't set.
  const orderNumber = await ensureOrderNumber(order.id, container).catch(() => order.custom_display_id ?? null)
  const orderRef = `#${orderNumber ?? order.display_id}`
  const storeUrl = (process.env.PLUGIN_STORE_URL || "http://localhost:3000").replace(/\/$/, "")
  const adminName = (process.env.PLATFORM_ADMIN_NAME || "Admin").trim()

  const shipping = toAmount(order.shipping_total)
  const discount = toAmount(order.discount_total)
  // Even after the stabilization loop above, trust whichever is larger
  // between Medusa's own total and what's independently derivable from the
  // (now-stabilized) line items and shipping fee - it should never be less.
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
