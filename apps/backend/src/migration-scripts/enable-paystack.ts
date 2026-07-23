import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const { updateRegionsWorkflow } = require("@medusajs/medusa/core-flows")

export default async function enablePaystack({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "currency_code", "*payment_providers"] })
  const ghana = regions.find((region: { currency_code?: string }) => region.currency_code?.toLowerCase() === "ghs")
  if (!ghana) throw new Error("Cannot enable Paystack: no GHS region exists")
  const current = (ghana.payment_providers ?? []).flatMap((provider: { id?: string } | null) => provider?.id ? [provider.id] : [])
  const paymentProviders = [...new Set([...current, "pp_paystack_paystack"])]
  await updateRegionsWorkflow(container).run({ input: { selector: { id: ghana.id }, update: { payment_providers: paymentProviders } } })
  console.log(`Paystack enabled for GHS region ${ghana.id}`)
}
