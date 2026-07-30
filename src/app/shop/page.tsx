import dynamic from "next/dynamic";
import { AppShell } from "@/components/store/AppShell";
import { getActiveProducts } from "@/lib/db/products";
import { getActiveCategories } from "@/lib/db/categories";

const ProductCatalog = dynamic(
  () => import("@/components/storefront/ProductCatalog").then((mod) => mod.ProductCatalog),
  {
    loading: () => (
      <section className="ed-shop" aria-busy="true" aria-label="Loading products">
        <div className="ed-product-grid ed-shop-grid">
          {Array.from({ length: 9 }, (_, index) => (
            <div className="skeleton-card" key={index} />
          ))}
        </div>
      </section>
    ),
  }
);

export default async function ShopPage() {
  const [products, categories] = await Promise.all([getActiveProducts(), getActiveCategories()]);
  const departments = Array.from(new Set(categories.map((category) => category.name)));

  return (
    <AppShell className="ed-page">
      <ProductCatalog departments={departments} products={products} />
    </AppShell>
  );
}
