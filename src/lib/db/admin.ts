import { getSql } from "@/lib/db/client";

export type AdminSummary = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalProducts: number;
};

export async function getAdminSummary(): Promise<AdminSummary> {
  const sql = getSql();

  const [orderStats] = await sql<{ total_orders: string; total_revenue: string | null; pending_orders: string }[]>`
    select
      count(*) as total_orders,
      sum(total_amount) filter (where payment_status = 'paid') as total_revenue,
      count(*) filter (where status = 'pending') as pending_orders
    from medusastore.orders
  `;

  const [productStats] = await sql<{ total_products: string }[]>`
    select count(*) as total_products from medusastore.products where status = 'active'
  `;

  return {
    totalOrders: Number(orderStats?.total_orders ?? 0),
    totalRevenue: Number(orderStats?.total_revenue ?? 0) / 100,
    pendingOrders: Number(orderStats?.pending_orders ?? 0),
    totalProducts: Number(productStats?.total_products ?? 0),
  };
}
