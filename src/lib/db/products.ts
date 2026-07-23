import { unstable_cache } from "next/cache";

import { medusaCatalogue, type StoreProduct } from "@/lib/medusa/catalogue";

export type { BranchStock, StoreProduct } from "@/lib/medusa/catalogue";

async function queryActiveProducts(): Promise<StoreProduct[]> {
  return medusaCatalogue.listProducts();
}

export const getActiveProducts = unstable_cache(queryActiveProducts, ["medusa-active-products"], {
  revalidate: 60,
  tags: ["products", "medusa-products"],
});

async function queryProductBySlug(slug: string): Promise<StoreProduct | null> {
  const products = await medusaCatalogue.listProducts({ handle: slug, limit: 1 });
  return products[0] ?? null;
}

export const getProductBySlug = unstable_cache(queryProductBySlug, ["medusa-product-by-slug"], {
  revalidate: 60,
  tags: ["products", "medusa-products"],
});

async function queryRelatedProducts(categoryId: string | null, excludeProductId: string, limit = 4): Promise<StoreProduct[]> {
  if (!categoryId) return [];
  const products = await medusaCatalogue.listProducts({ category_id: [categoryId], limit: limit + 1 });
  return products.filter((product) => product.id !== excludeProductId).slice(0, limit);
}

export const getRelatedProducts = unstable_cache(queryRelatedProducts, ["medusa-related-products"], {
  revalidate: 60,
  tags: ["products", "medusa-products"],
});

export async function getFlashDeals(limit = 8): Promise<StoreProduct[]> {
  return (await getActiveProducts()).filter((product) => product.discountEligible).slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<StoreProduct[]> {
  return (await getActiveProducts()).filter((product) => product.isBestSeller).slice(0, limit);
}
