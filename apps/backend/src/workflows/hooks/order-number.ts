import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ensureOrderNumber } from "../../lib/order-number"

// Runs synchronously as part of cart completion (before the storefront gets
// its response), so the friendly order number is already set by the time
// the confirmation page loads. Medusa's completeCartWorkflow emits
// order.placed *before* this hook runs, so the order.placed subscriber
// (order-placed.ts) may already have generated it first - ensureOrderNumber
// is idempotent either way, see its own comment.
createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  // Best-effort: a bug or transient DB hiccup here must never block the
  // order that was just paid for - the customer keeps Medusa's numeric
  // display_id as a fallback (see mapMedusaOrder's `||`) rather than losing
  // their order entirely.
  try {
    await ensureOrderNumber((order as { id: string }).id, container)
  } catch (cause) {
    console.error("order-number hook failed", cause)
  }
})
