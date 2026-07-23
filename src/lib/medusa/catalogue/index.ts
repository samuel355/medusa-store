import { medusaConfig, medusaSdk } from "../sdk";
import { createCatalogueAdapter } from "./adapter";

export type { BranchStock, StoreCategory, StoreProduct } from "./contracts";
export { MedusaCatalogueContractError } from "./errors";
export { mapMedusaCategory, mapMedusaProduct } from "./mapper";

export const medusaCatalogue = createCatalogueAdapter(
  medusaSdk.store,
  medusaConfig.regionId,
);
