import { getSql } from "@/lib/db/client";

export async function createPaymentForOrder(input: {
  orderId: string;
  customerId?: string;
  reference: string;
  amountPesewas: number;
  accessCode?: string;
  authorizationUrl?: string;
}) {
  const sql = getSql();
  await sql`
    insert into medusastore.payments (
      order_id, customer_id, provider, provider_reference, access_code, authorization_url, amount, status
    ) values (
      ${input.orderId}, ${input.customerId ?? null}, 'paystack', ${input.reference},
      ${input.accessCode ?? null}, ${input.authorizationUrl ?? null}, ${input.amountPesewas}, 'initialized'
    )
    on conflict (provider_reference) do nothing
  `;
}

/**
 * Atomically transitions a payment to paid exactly once. Returns null if the
 * reference is unknown or was already marked paid (so callers can skip
 * re-enqueueing fulfillment/notification jobs on webhook retries).
 */
export async function markPaymentPaidIfPending(reference: string, channel?: string) {
  const sql = getSql();

  const rows = await sql<{ order_id: string | null; amount: number; customer_id: string | null }[]>`
    update medusastore.payments set
      status = 'paid',
      paid_at = now(),
      channel = coalesce(${channel ?? null}, channel)
    where provider_reference = ${reference} and status <> 'paid'
    returning order_id, amount, customer_id
  `;

  if (rows.length === 0) return null;

  const payment = rows[0];
  if (payment.order_id) {
    await sql`
      update medusastore.orders set
        payment_status = 'paid',
        status = case when status = 'pending' then 'confirmed' else status end,
        fulfillment_status = case when fulfillment_status = 'not_fulfilled' then 'queued' else fulfillment_status end
      where id = ${payment.order_id}
    `;
  }

  return payment;
}

export async function logPaystackEvent(input: {
  event: string;
  reference?: string;
  orderId?: string;
  payload: unknown;
}) {
  const sql = getSql();
  await sql`
    insert into medusastore.paystack_events (event, reference, order_id, payload, processed_at)
    values (${input.event}, ${input.reference ?? null}, ${input.orderId ?? null}, ${JSON.stringify(input.payload)}, now())
  `;
}
