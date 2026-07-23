import type { HttpTypes } from "@medusajs/types";

import { MedusaIntegrationError } from "../errors";
import type { StoreCategory, StoreProduct } from "./contracts";
import { MedusaCatalogueContractError } from "./errors";
import { mapMedusaCategory, mapMedusaProduct } from "./mapper";
import type { CatalogueStoreClient } from "./types";

const PAGE_SIZE = 100;

export function createCatalogueAdapter(client: CatalogueStoreClient, regionId: string) {
  async function listProducts(query: HttpTypes.StoreProductListParams = {}): Promise<StoreProduct[]> {
    const operation = "list storefront products";
    try {
      const isExhaustive = query.limit === undefined && query.offset === undefined;
      if (!isExhaustive) {
        const response = await client.product.list({
          ...query,
          region_id: regionId,
          fields: "+variants.inventory_quantity,*variants.calculated_price,*variants.options,*categories,*images,*collection",
        });
        return response.products.map(mapMedusaProduct);
      }

      const products: HttpTypes.StoreProduct[] = [];
      let offset = 0;
      let count = 0;
      do {
        const response = await client.product.list({
          ...query,
          region_id: regionId,
          limit: PAGE_SIZE,
          offset,
          fields: "+variants.inventory_quantity,*variants.calculated_price,*variants.options,*categories,*images,*collection",
        });
        products.push(...response.products);
        count = response.count;
        const pageLength = response.products.length;
        offset += pageLength;
        if (pageLength === 0) break;
      } while (offset < count);
      return products.map(mapMedusaProduct);
    } catch (cause) {
      if (cause instanceof MedusaIntegrationError || cause instanceof MedusaCatalogueContractError) throw cause;
      throw new MedusaIntegrationError(operation, cause);
    }
  }

  async function listCategories(): Promise<StoreCategory[]> {
    const operation = "list storefront categories";
    try {
      const categories: HttpTypes.StoreProductCategory[] = [];
      let offset = 0;
      let count = 0;
      do {
        const response = await client.category.list({ limit: PAGE_SIZE, offset });
        categories.push(...response.product_categories);
        count = response.count;
        const pageLength = response.product_categories.length;
        offset += pageLength;
        if (pageLength === 0) break;
      } while (offset < count);
      return categories.map(mapMedusaCategory);
    } catch (cause) {
      if (cause instanceof MedusaCatalogueContractError) throw cause;
      throw new MedusaIntegrationError(operation, cause);
    }
  }

  return { listProducts, listCategories };
}
