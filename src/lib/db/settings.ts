import { getSql } from "@/lib/db/client";

export type CustomerSettings = {
  smsOrderUpdates: boolean;
  emailReceipts: boolean;
  backInStockAlerts: boolean;
  marketingOptIn: boolean;
  preferredPaymentMethod: string;
};

const DEFAULT_SETTINGS: CustomerSettings = {
  smsOrderUpdates: true,
  emailReceipts: true,
  backInStockAlerts: true,
  marketingOptIn: false,
  preferredPaymentMethod: "paystack",
};

export async function getCustomerSettings(customerId: string): Promise<CustomerSettings> {
  const sql = getSql();
  const rows = await sql<
    {
      sms_order_updates: boolean;
      email_receipts: boolean;
      back_in_stock_alerts: boolean;
      marketing_opt_in: boolean;
      preferred_payment_method: string;
    }[]
  >`
    select sms_order_updates, email_receipts, back_in_stock_alerts, marketing_opt_in, preferred_payment_method
    from medusastore.customer_settings where customer_id = ${customerId}
  `;

  if (rows.length === 0) return DEFAULT_SETTINGS;

  const row = rows[0];
  return {
    smsOrderUpdates: row.sms_order_updates,
    emailReceipts: row.email_receipts,
    backInStockAlerts: row.back_in_stock_alerts,
    marketingOptIn: row.marketing_opt_in,
    preferredPaymentMethod: row.preferred_payment_method,
  };
}

export async function updateCustomerSettings(customerId: string, patch: Partial<CustomerSettings>) {
  const sql = getSql();
  await sql`
    insert into medusastore.customer_settings (
      customer_id, sms_order_updates, email_receipts, back_in_stock_alerts, marketing_opt_in, preferred_payment_method
    ) values (
      ${customerId},
      ${patch.smsOrderUpdates ?? DEFAULT_SETTINGS.smsOrderUpdates},
      ${patch.emailReceipts ?? DEFAULT_SETTINGS.emailReceipts},
      ${patch.backInStockAlerts ?? DEFAULT_SETTINGS.backInStockAlerts},
      ${patch.marketingOptIn ?? DEFAULT_SETTINGS.marketingOptIn},
      ${patch.preferredPaymentMethod ?? DEFAULT_SETTINGS.preferredPaymentMethod}
    )
    on conflict (customer_id) do update set
      sms_order_updates = coalesce(${patch.smsOrderUpdates ?? null}, medusastore.customer_settings.sms_order_updates),
      email_receipts = coalesce(${patch.emailReceipts ?? null}, medusastore.customer_settings.email_receipts),
      back_in_stock_alerts = coalesce(${patch.backInStockAlerts ?? null}, medusastore.customer_settings.back_in_stock_alerts),
      marketing_opt_in = coalesce(${patch.marketingOptIn ?? null}, medusastore.customer_settings.marketing_opt_in),
      preferred_payment_method = coalesce(${patch.preferredPaymentMethod ?? null}, medusastore.customer_settings.preferred_payment_method),
      updated_at = now()
  `;
}
