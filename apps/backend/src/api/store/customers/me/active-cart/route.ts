import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"

// Cart IDs are stored client-side (localStorage) and never synced across
// devices - a customer who adds items on one device and signs in on another
// has no way to find their earlier cart. This returns the most recent
// not-yet-completed cart already linked to the authenticated customer (via
// cart.transferCart, see /api/medusa/attach-cart-customer in the storefront)
// so a new device can recover and merge into it. Only the cart ID goes back;
// the storefront retrieves the cart itself through the normal, unauthenticated
// store cart-by-ID endpoint, same as any guest cart.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id

  const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)
  const [cart] = await cartModuleService.listCarts(
    { customer_id: customerId, completed_at: { $eq: null } },
    { order: { updated_at: "DESC" }, take: 1 },
  )

  res.status(200).json({ cartId: cart?.id ?? null })
}
