import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICacheService } from "@medusajs/framework/types"

// Guest order lookup by the 8-character order number has no natural secret
// behind it (unlike lookup by Medusa's own long internal order ID, which is
// what links from email/confirmation use and stays unauthenticated on
// purpose). Requiring order number + email/phone together, a generic
// not-found response either way, and a per-IP rate limit keep this from
// becoming a way to browse other customers' orders.
const RATE_LIMIT_MAX_ATTEMPTS = 8
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60

function normalizeContact(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.includes("@")) return trimmed
  // Ghana numbers show up as 0XXXXXXXXX, 233XXXXXXXXX, or +233XXXXXXXXX
  // depending on where they were typed in - comparing the last 9 digits
  // matches regardless of prefix.
  return trimmed.replace(/\D/g, "").slice(-9)
}

function clientIp(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim()
  return req.ip ?? "unknown"
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { orderNumber?: string; contact?: string }
  const orderNumber = (body.orderNumber ?? "").trim().toUpperCase()
  const contact = (body.contact ?? "").trim()

  if (!orderNumber || !contact) {
    res.status(400).json({ error: "Order number and contact are required." })
    return
  }

  try {
    const cacheService: ICacheService = req.scope.resolve(Modules.CACHE)
    const rateLimitKey = `order-lookup-rl:${clientIp(req)}`
    const attempts = (await cacheService.get<number>(rateLimitKey)) ?? 0
    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many attempts. Try again later." })
      return
    }
    await cacheService.set(rateLimitKey, attempts + 1, RATE_LIMIT_WINDOW_SECONDS)
  } catch {
    // Best-effort - a cache outage should never block a legitimate lookup.
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "custom_display_id", "status", "email", "currency_code",
      "total", "subtotal", "shipping_total", "created_at",
      "payment_status", "fulfillment_status",
      "shipping_address.*",
      "items.title", "items.variant_sku", "items.variant_id", "items.quantity", "items.unit_price", "items.total", "items.thumbnail",
    ],
    filters: { custom_display_id: orderNumber } as Record<string, unknown>,
  })
  const order = orders[0]

  const normalizedContact = normalizeContact(contact)
  const emailMatch = order?.email ? order.email.toLowerCase() === normalizedContact : false
  const phoneMatch = order?.shipping_address?.phone ? normalizeContact(order.shipping_address.phone) === normalizedContact : false

  if (!order || (!emailMatch && !phoneMatch)) {
    res.status(404).json({ error: "No matching order found." })
    return
  }

  res.status(200).json({ order })
}
