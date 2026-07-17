import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  BuildingStorefront,
  ChartBar,
  CurrencyDollar,
  ShoppingBag,
  TruckFast,
} from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";

const storefrontUrl =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "/shop";

const summaryCards = [
  {
    label: "Revenue today",
    value: "GH₵ 18,420",
    change: "+18.4%",
    tone: "bg-orange-50 text-orange-700",
  },
  {
    label: "Orders",
    value: "126",
    change: "24 processing",
    tone: "bg-stone-50 text-stone-700",
  },
  {
    label: "Average order",
    value: "GH₵ 312",
    change: "+6.2%",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Low stock",
    value: "14",
    change: "Needs action",
    tone: "bg-amber-50 text-amber-800",
  },
];

const quickLinks = [
  { label: "Manage orders", href: "/app/orders", meta: "Confirm, fulfil, dispatch" },
  { label: "Products", href: "/app/products", meta: "Variants, pricing, images" },
  { label: "Inventory", href: "/app/inventory", meta: "Branch stock levels" },
  { label: "Customers", href: "/app/customers", meta: "Profiles and order history" },
  { label: "Promotions", href: "/app/promotions", meta: "Sales and discounts" },
  { label: "Settings", href: "/app/settings", meta: "Staff, regions, payments" },
];

const topProducts = [
  { name: "Orange Linen Resort Shirt", sold: 42, revenue: "GH₵ 7,140" },
  { name: "Ankara Midi Dress", sold: 36, revenue: "GH₵ 9,720" },
  { name: "Tailored Work Trousers", sold: 31, revenue: "GH₵ 6,820" },
  { name: "Traditional Kaftan Set", sold: 27, revenue: "GH₵ 10,260" },
];

const fulfilment = [
  { label: "Paid", value: 78, color: "bg-orange-500" },
  { label: "Processing", value: 54, color: "bg-stone-900" },
  { label: "Dispatched", value: 39, color: "bg-emerald-500" },
  { label: "Returns", value: 8, color: "bg-amber-500" },
];

const branchStock = [
  { branch: "Accra Mall", stock: "1,248 units", alert: "6 low-stock SKUs" },
  { branch: "East Legon", stock: "892 units", alert: "3 low-stock SKUs" },
  { branch: "Kumasi", stock: "731 units", alert: "5 low-stock SKUs" },
];

const DashboardRoute = () => {
  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <Container className="border-ui-border-base bg-white p-0 shadow-sm">
        <div className="relative overflow-hidden border-b border-orange-100 bg-white px-6 py-6 md:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-orange-100 to-transparent md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-3 border-orange-200 bg-orange-50 text-orange-700">
                SobalShop admin
              </Badge>
              <Heading level="h1" className="text-2xl font-semibold text-stone-950">
                Fashion commerce dashboard
              </Heading>
              <Text className="mt-2 max-w-[620px] text-stone-600">
                Track today&apos;s sales, stock movement, fulfilment and customer activity from one clean workspace.
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

        <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm"
            >
              <Text className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {card.label}
              </Text>
              <div className="mt-3 flex items-end justify-between gap-3">
                <Heading level="h2" className="text-2xl font-semibold text-stone-950">
                  {card.value}
                </Heading>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${card.tone}`}>
                  {card.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 px-4 pb-6 md:px-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <Heading level="h2" className="text-lg font-semibold text-stone-950">
                  Revenue and fulfilment
                </Heading>
                <Text className="text-stone-500">Current operating view across payment and dispatch.</Text>
              </div>
              <ChartBar className="text-orange-600" />
            </div>

            <div className="space-y-4">
              {fulfilment.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">{item.label}</span>
                    <span className="text-stone-500">{item.value} orders</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.min(item.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {branchStock.map((branch) => (
                <div key={branch.branch} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <Text className="font-medium text-stone-900">{branch.branch}</Text>
                  <Text className="mt-1 text-stone-600">{branch.stock}</Text>
                  <Text className="mt-2 text-xs text-orange-700">{branch.alert}</Text>
                </div>
              ))}
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
              {quickLinks.map((link) => (
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
                Top-selling products
              </Heading>
              <CurrencyDollar className="text-orange-600" />
            </div>
            <div className="divide-y divide-stone-100">
              {topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Text className="font-medium text-stone-900">{product.name}</Text>
                    <Text className="text-xs text-stone-500">{product.sold} sold today</Text>
                  </div>
                  <Text className="font-semibold text-stone-950">{product.revenue}</Text>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Heading level="h2" className="text-lg font-semibold text-stone-950">
                Operations watchlist
              </Heading>
              <TruckFast className="text-orange-600" />
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-orange-50 p-4">
                <Text className="font-medium text-orange-800">Mobile Money confirmations</Text>
                <Text className="mt-1 text-sm text-orange-700">12 payments need status review before fulfilment.</Text>
              </div>
              <div className="rounded-lg bg-stone-50 p-4">
                <Text className="font-medium text-stone-900">Same-day Accra dispatch</Text>
                <Text className="mt-1 text-sm text-stone-600">39 orders are ready for courier pickup.</Text>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <Text className="font-medium text-amber-900">Returns queue</Text>
                <Text className="mt-1 text-sm text-amber-800">8 requests are awaiting inspection or refund approval.</Text>
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
