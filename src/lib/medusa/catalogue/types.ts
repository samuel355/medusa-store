import type { HttpTypes } from "@medusajs/types";

export type CatalogueProduct = HttpTypes.StoreProduct;
export type CatalogueCategory = HttpTypes.StoreProductCategory;

export interface CatalogueStoreClient {
  product: {
    list(
      query?: HttpTypes.StoreProductListParams,
    ): Promise<HttpTypes.StoreProductListResponse>;
  };
  category: {
    list(
      query?: HttpTypes.StoreProductCategoryListParams,
    ): Promise<HttpTypes.StoreProductCategoryListResponse>;
  };
}
