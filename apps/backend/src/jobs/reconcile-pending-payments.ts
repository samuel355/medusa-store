import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

const { completeCartWorkflow } = require("@medusajs/medusa/core-flows");

const LOOKBACK_HOURS = 24;
const MIN_AGE_MINUTES = 3;
const PAYSTACK_PROVIDER_ID = "pp_paystack_paystack";

export default async function reconcilePendingPayments(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const before = new Date(Date.now() - MIN_AGE_MINUTES * 60 * 1000).toISOString();

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "completed_at",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.provider_id",
    ],
    filters: {
      created_at: { $gte: since, $lte: before },
    },
  });

  const candidates = carts.filter((cart) => {
    if (cart.completed_at) return false;
    const sessions = cart.payment_collection?.payment_sessions ?? [];
    return sessions.some(
      (session) => session?.status === "pending" && session?.provider_id === PAYSTACK_PROVIDER_ID,
    );
  });

  if (candidates.length === 0) return;

  logger.info(
    `[reconcile-pending-payments] checking ${candidates.length} cart(s) with a pending Paystack session`,
  );

  for (const cart of candidates) {
    try {
      const { result } = await completeCartWorkflow(container).run({ input: { id: cart.id } });
      logger.info(`[reconcile-pending-payments] completed cart ${cart.id} -> order ${result.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error);
      logger.info(`[reconcile-pending-payments] cart ${cart.id} still not payable: ${message}`);
    }
  }
}

export const config = {
  name: "reconcile-pending-payments",
  schedule: "*/2 * * * *",
};
