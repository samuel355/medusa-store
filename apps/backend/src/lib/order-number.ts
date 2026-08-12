import crypto from "node:crypto"
import { Modules } from "@medusajs/framework/utils"
import type { IOrderModuleService, UpdateOrderDTO, MedusaContainer } from "@medusajs/framework/types"

// No 0/O/1/I/L - avoids characters that look alike when read off a phone
// screen or written down, since customers quote this back for tracking.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const LENGTH = 8

function generateCode(): string {
  let code = ""
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)]
  }
  return code
}

// Two independent places need the friendly order number to exist: the
// orderCreated workflow hook (so it's set before the storefront's checkout
// response, for the confirmation page) and the order.placed event subscriber
// (so SMS/email don't fall back to Medusa's raw numeric display_id). Medusa's
// completeCartWorkflow emits order.placed *before* the orderCreated hook
// runs, so whichever of the two runs first must generate and persist the
// code, and whichever runs second must just read it back rather than
// generating a second, different one for the same order.
export async function ensureOrderNumber(orderId: string, container: MedusaContainer): Promise<string> {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)

  // custom_display_id is a real column on the order model (@medusajs/order's
  // models/order.ts) but the published OrderDTO/UpdateOrderDTO types haven't
  // caught up to it yet - confirmed at the DB/model level.
  const order = (await orderModuleService.retrieveOrder(orderId)) as unknown as { custom_display_id?: string | null }
  if (order.custom_display_id) return order.custom_display_id

  let code = generateCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const clashes = await orderModuleService.listOrders(
      { custom_display_id: code } as Record<string, unknown>,
      { take: 1 },
    )
    if (clashes.length === 0) break
    code = generateCode()
  }

  await orderModuleService.updateOrders(orderId, { custom_display_id: code } as unknown as UpdateOrderDTO)
  return code
}
