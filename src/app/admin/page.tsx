import { redirect } from "next/navigation";
import { AppShell } from "@/components/store/AppShell";
import { createServerSupabaseClient } from "@/lib/integrations/supabase";
import { isAdminAuthUser } from "@/lib/db/customers";
import { listAllOrders } from "@/lib/db/orders";
import { getActiveProducts } from "@/lib/db/products";
import { getAdminSummary } from "@/lib/db/admin";
import { AdminOrdersTable } from "@/components/storefront/AdminOrdersTable";
import { formatMoney } from "@/lib/utils/money";

export default async function AdminPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdminAuthUser(user.id);
  if (!admin) redirect("/customers");

  const [summary, orders, products] = await Promise.all([getAdminSummary(), listAllOrders(), getActiveProducts()]);

  return (
    <AppShell className="app-page admin-page">
      <section className="market-section">
        <div className="market-section-head">
          <div>
            <p className="kicker">Admin</p>
            <h1>Store operations</h1>
          </div>
        </div>
        <div className="metric-grid account-metrics">
          <article>
            <strong>{summary.totalOrders}</strong>
            <span>Total orders</span>
          </article>
          <article>
            <strong>{formatMoney(summary.totalRevenue)}</strong>
            <span>Revenue (paid)</span>
          </article>
          <article>
            <strong>{summary.pendingOrders}</strong>
            <span>Pending orders</span>
          </article>
          <article>
            <strong>{summary.totalProducts}</strong>
            <span>Active products</span>
          </article>
        </div>
      </section>

      <AdminOrdersTable orders={orders} />

      <section className="market-section">
        <h2>Products</h2>
        <div className="orders-table">
          {products.map((product) => (
            <article key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.sku}</span>
              </div>
              <span>{product.category}</span>
              <span>{product.stock}</span>
              <b>{formatMoney(product.price)}</b>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
