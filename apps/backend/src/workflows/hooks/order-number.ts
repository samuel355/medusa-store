import crypto from "node:crypto"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import type { IOrderModuleService, UpdateOrderDTO } from "@medusajs/framework/types"

// No 0/O/1/I/L - avoids characters that look alike when read off a phone
// screen or written down, since customers quote this back for tracking.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const LENGTH = 8

function generateOrderNumber(): string {
  let code = ""
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)]
  }
  return code
}

// Runs synchronously as part of cart completion (before the storefront gets
// its response), so the friendly order number is already set by the time
// the confirmation page loads - no async gap where the raw numeric
// display_id would flash first.
createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  // Best-effort: a bug or transient DB hiccup here must never block the
  // order that was just paid for - the customer keeps Medusa's numeric
  // display_id as a fallback (see mapMedusaOrder's `||`) rather than losing
  // their order entirely.
  try {
    const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
    const orderId = (order as { id: string }).id

    let code = generateOrderNumber()
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await orderModuleService.listOrders(
        { custom_display_id: code } as Record<string, unknown>,
        { take: 1 },
      )
      if (existing.length === 0) break
      code = generateOrderNumber()
    }

    // custom_display_id is a real column on the order model (@medusajs/order's
    // models/order.ts) but the published UpdateOrderDTO/FilterableOrderProps
    // types haven't caught up to it yet - confirmed at the DB/model level.
    await orderModuleService.updateOrders(orderId, { custom_display_id: code } as unknown as UpdateOrderDTO)
  } catch (cause) {
    console.error("order-number hook failed", cause)
  }
})
