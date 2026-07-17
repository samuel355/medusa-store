import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { ProductCatalog } from "@/components/storefront/ProductCatalog";
import { getActiveProducts } from "@/lib/db/products";
import { getActiveCategories } from "@/lib/db/categories";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getActiveProducts(), getActiveCategories()]);
  const departments = Array.from(new Set(categories.map((category) => category.name)));

  return (
    <AppShell className="app-page shop-page">
      <AppHero
        kicker="Shop"
        title="Fresh fashion, ready to checkout."
        description="Browse new arrivals, best sellers, sale pieces, sizes, colours, and delivery-ready stock."
      />
      <ProductCatalog departments={departments} products={products} />
    </AppShell>
  );
}
