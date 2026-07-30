import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  BuildingStorefront,
  ChartBar,
  CurrencyDollar,
  ShoppingBag,
  TruckFast,
} from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { getStorefrontUrl } from "../../lib/storefront-url";

const WINDOW_DAYS = 30;
const LOW_STOCK_THRESHOLD = 10;

const SETTLED_PAYMENT_STATUSES = new Set([
  "captured",
  "partially_captured",
  "partially_refunded",
  "refunded",
]);

const FULFILLMENT_LABELS: Record<string, string> = {
  not_fulfilled: "Not fulfilled",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
  partially_shipped: "Partially shipped",
  shipped: "Shipped",
  partially_delivered: "Partially delivered",
  delivered: "Delivered",
  canceled: "Canceled",
};

const FULFILLMENT_COLORS: Record<string, string> = {
  not_fulfilled: "bg-stone-400",
  partially_fulfilled: "bg-amber-500",
  fulfilled: "bg-orange-500",
  partially_shipped: "bg-amber-500",
  shipped: "bg-orange-500",
  partially_delivered: "bg-orange-500",
  delivered: "bg-emerald-500",
  canceled: "bg-stone-300",
};

type OrderItem = { title?: string; quantity?: number; unit_price?: number };
type Order = {
  id: string;
  total?: number;
  currency_code?: string;
  payment_status?: string;
  fulfillment_status?: string;
  created_at?: string;
  items?: OrderItem[];
};
type InventoryLocationLevel = { location_id: string; available_quantity?: number };
type InventoryItem = {
  id: string;
  stocked_quantity?: number;
  reserved_quantity?: number;
  location_levels?: InventoryLocationLevel[];
};
type StockLocation = { id: string; name: string };

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) throw new Error(`Request to ${path} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

function useDashboardOrders() {
  return useQuery({
    queryKey: ["begnon-dashboard-orders"],
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        limit: "200",
        fields: "id,total,currency_code,payment_status,fulfillment_status,created_at,items.title,items.quantity,items.unit_price",
        "created_at[$gte]": since,
      });
      const data = await fetchJson<{ orders: Order[] }>(`/admin/orders?${params}`);
      return data.orders;
    },
  });
}

function useDashboardInventory() {
  return useQuery({
    queryKey: ["begnon-dashboard-inventory"],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "200",
        fields: "id,stocked_quantity,reserved_quantity,*location_levels",
      });
      const data = await fetchJson<{ inventory_items: InventoryItem[] }>(`/admin/inventory-items?${params}`);
      return data.inventory_items;
    },
  });
}

function useDashboardStockLocations() {
  return useQuery({
    queryKey: ["begnon-dashboard-stock-locations"],
    queryFn: async () => {
      const data = await fetchJson<{ stock_locations: StockLocation[] }>("/admin/stock-locations?fields=id,name&limit=50");
      return data.stock_locations;
    },
  });
}

function useDashboardReturns() {
  return useQuery({
    queryKey: ["begnon-dashboard-returns"],
    queryFn: async () => {
      const data = await fetchJson<{ count: number }>("/admin/returns?limit=1&status[]=requested");
      return data.count;
    },
  });
}

function money(amount: number, currencyCode = "GHS") {
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency: currencyCode.toUpperCase(), maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currencyCode.toUpperCase()} ${amount.toFixed(0)}`;
  }
}

const DashboardRoute = () => {
  const storefrontUrl = getStorefrontUrl();
  const ordersQuery = useDashboardOrders();
  const inventoryQuery = useDashboardInventory();
  const locationsQuery = useDashboardStockLocations();
  const returnsQuery = useDashboardReturns();

  const isLoading = ordersQuery.isLoading || inventoryQuery.isLoading || locationsQuery.isLoading || returnsQuery.isLoading;
  const hasError = ordersQuery.isError || inventoryQuery.isError || locationsQuery.isError || returnsQuery.isError;

  const orders = ordersQuery.data ?? [];
  const inventoryItems = inventoryQuery.data ?? [];
  const stockLocations = locationsQuery.data ?? [];
  const returnsCount = returnsQuery.data ?? 0;

  const currencyCode = orders[0]?.currency_code ?? "GHS";
  const revenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const ordersCount = orders.length;
  const avgOrder = ordersCount > 0 ? revenue / ordersCount : 0;

  const paymentsNeedingReview = orders.filter(
    (order) => order.payment_status && !SETTLED_PAYMENT_STATUSES.has(order.payment_status)
  ).length;
  const readyForDispatch = orders.filter((order) => order.fulfillment_status === "not_fulfilled").length;

  const fulfilmentCounts = orders.reduce<Record<string, number>>((acc, order) => {
    const status = order.fulfillment_status ?? "not_fulfilled";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  const productTotals = new Map<string, { qty: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (!item.title) continue;
      const entry = productTotals.get(item.title) ?? { qty: 0, revenue: 0 };
      entry.qty += item.quantity ?? 0;
      entry.revenue += (item.unit_price ?? 0) * (item.quantity ?? 0);
      productTotals.set(item.title, entry);
    }
  }
  const topProducts = [...productTotals.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 4);

  const lowStockCount = inventoryItems.filter((item) => {
    const available = (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0);
    return available <= LOW_STOCK_THRESHOLD;
  }).length;

  const branchStock = stockLocations.map((location) => {
    const levels = inventoryItems.flatMap((item) => item.location_levels ?? []).filter((level) => level.location_id === location.id);
    const totalUnits = levels.reduce((sum, level) => sum + (level.available_quantity ?? 0), 0);
    const lowStockSkus = inventoryItems.filter((item) => {
      const level = (item.location_levels ?? []).find((l) => l.location_id === location.id);
      return level && (level.available_quantity ?? 0) <= LOW_STOCK_THRESHOLD;
    }).length;
    return { ...location, totalUnits, lowStockSkus };
  });

  const summaryCards = [
    { label: `Revenue (${WINDOW_DAYS}d)`, value: money(revenue, currencyCode), tone: "bg-orange-50 text-orange-700" },
    { label: `Orders (${WINDOW_DAYS}d)`, value: String(ordersCount), tone: "bg-stone-50 text-stone-700" },
    { label: "Average order", value: ordersCount > 0 ? money(avgOrder, currencyCode) : "—", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Low stock SKUs", value: String(lowStockCount), tone: "bg-amber-50 text-amber-800" },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <Container className="border-ui-border-base bg-white p-0 shadow-sm">
        <div className="relative overflow-hidden border-b border-orange-100 bg-white px-6 py-6 md:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-orange-100 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-3 border-orange-200 bg-orange-50 text-orange-700">
                Begnon admin
              </Badge>
              <Heading level="h1" className="text-2xl font-semibold text-stone-950">
                Fashion commerce dashboard
              </Heading>
              <Text className="mt-2 max-w-[620px] text-stone-600">
                Live sales, stock and fulfilment pulled directly from your store data.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-orange-600 text-white hover:bg-orange-700">
                <a href="/app/orders">View orders</a>
              </Button>
              <Button asChild variant="secondary">
                <a href={storefrontUrl}>Open shop</a>
              </Button>
            </div>
          </div>
        </div>

        {hasError ? (
          <div className="p-6">
            <Text className="text-rose-700">Couldn&apos;t load live dashboard data. Try refreshing the page.</Text>
          </div>
        ) : null}

        <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
              <Text className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {card.label}
              </Text>
              <div className="mt-3">
                <Heading level="h2" className="text-2xl font-semibold text-stone-950">
                  {isLoading ? "…" : card.value}
                </Heading>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 px-4 pb-6 md:px-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <Heading level="h2" className="text-lg font-semibold text-stone-950">
                  Fulfilment ({WINDOW_DAYS} days)
                </Heading>
                <Text className="text-stone-500">Order fulfilment status across the current window.</Text>
              </div>
              <ChartBar className="text-orange-600" />
            </div>

            {isLoading ? (
              <Text className="text-stone-500">Loading…</Text>
            ) : Object.keys(fulfilmentCounts).length === 0 ? (
              <Text className="text-stone-500">No orders in the last {WINDOW_DAYS} days yet.</Text>
            ) : (
              <div className="space-y-4">
                {Object.entries(fulfilmentCounts).map(([status, count]) => (
                  <div key={status}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-700">{FULFILLMENT_LABELS[status] ?? status}</span>
                      <span className="text-stone-500">{count} order{count === 1 ? "" : "s"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${FULFILLMENT_COLORS[status] ?? "bg-stone-400"}`}
                        style={{ width: `${Math.min((count / ordersCount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {branchStock.length === 0 && !isLoading ? (
                <Text className="text-stone-500">No stock locations configured.</Text>
              ) : (
                branchStock.map((branch) => (
                  <div key={branch.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <Text className="font-medium text-stone-900">{branch.name}</Text>
                    <Text className="mt-1 text-stone-600">{branch.totalUnits.toLocaleString()} units</Text>
                    <Text className="mt-2 text-xs text-orange-700">
                      {branch.lowStockSkus > 0 ? `${branch.lowStockSkus} low-stock SKUs` : "Stock healthy"}
                    </Text>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Heading level="h2" className="text-lg font-semibold text-stone-950">
                Quick actions
              </Heading>
              <ShoppingBag className="text-orange-600" />
            </div>
            <div className="space-y-2">
              {[
                { label: "Manage orders", href: "/app/orders", meta: "Confirm, fulfil, dispatch" },
                { label: "Products", href: "/app/products", meta: "Variants, pricing, images" },
                { label: "Inventory", href: "/app/inventory", meta: "Branch stock levels" },
                { label: "Customers", href: "/app/customers", meta: "Profiles and order history" },
                { label: "Promotions", href: "/app/promotions", meta: "Sales and discounts" },
                { label: "Settings", href: "/app/settings", meta: "Staff, regions, payments" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-stone-200 bg-white p-3 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <span className="block text-sm font-semibold text-stone-950">{link.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{link.meta}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 px-4 pb-6 md:px-6 xl:grid-cols-2">
          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Heading level="h2" className="text-lg font-semibold text-stone-950">
                Top-selling products ({WINDOW_DAYS} days)
              </Heading>
              <CurrencyDollar className="text-orange-600" />
            </div>
            {isLoading ? (
              <Text className="text-stone-500">Loading…</Text>
            ) : topProducts.length === 0 ? (
              <Text className="text-stone-500">No sales in the last {WINDOW_DAYS} days yet.</Text>
            ) : (
              <div className="divide-y divide-stone-100">
                {topProducts.map(([title, stats]) => (
                  <div key={title} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <Text className="font-medium text-stone-900">{title}</Text>
                      <Text className="text-xs text-stone-500">{stats.qty} sold</Text>
                    </div>
                    <Text className="font-semibold text-stone-950">{money(stats.revenue, currencyCode)}</Text>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Heading level="h2" className="text-lg font-semibold text-stone-950">
                Operations watchlist
              </Heading>
              <TruckFast className="text-orange-600" />
            </div>
            <div className="space-y-3">
              <div className={`rounded-lg p-4 ${paymentsNeedingReview > 0 ? "bg-orange-50" : "bg-stone-50"}`}>
                <Text className={`font-medium ${paymentsNeedingReview > 0 ? "text-orange-800" : "text-stone-900"}`}>
                  Payments needing review
                </Text>
                <Text className={`mt-1 text-sm ${paymentsNeedingReview > 0 ? "text-orange-700" : "text-stone-600"}`}>
                  {isLoading ? "…" : paymentsNeedingReview > 0 ? `${paymentsNeedingReview} order${paymentsNeedingReview === 1 ? "" : "s"} need payment status review.` : "All payments settled."}
                </Text>
              </div>
              <div className={`rounded-lg p-4 ${readyForDispatch > 0 ? "bg-stone-50" : "bg-stone-50"}`}>
                <Text className="font-medium text-stone-900">Ready for dispatch</Text>
                <Text className="mt-1 text-sm text-stone-600">
                  {isLoading ? "…" : readyForDispatch > 0 ? `${readyForDispatch} order${readyForDispatch === 1 ? "" : "s"} awaiting fulfilment.` : "Nothing waiting on fulfilment."}
                </Text>
              </div>
              <div className={`rounded-lg p-4 ${returnsCount > 0 ? "bg-amber-50" : "bg-stone-50"}`}>
                <Text className={`font-medium ${returnsCount > 0 ? "text-amber-900" : "text-stone-900"}`}>
                  Returns queue
                </Text>
                <Text className={`mt-1 text-sm ${returnsCount > 0 ? "text-amber-800" : "text-stone-600"}`}>
                  {isLoading ? "…" : returnsCount > 0 ? `${returnsCount} request${returnsCount === 1 ? "" : "s"} awaiting inspection or refund approval.` : "No returns awaiting action."}
                </Text>
              </div>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
};

export const config = defineRouteConfig({
  label: "Dashboard",
  icon: BuildingStorefront,
  rank: -1000,
});

export default DashboardRoute;
