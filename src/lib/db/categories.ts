import { unstable_cache } from "next/cache";

import { medusaCatalogue, type StoreCategory } from "@/lib/medusa/catalogue";

export type { StoreCategory } from "@/lib/medusa/catalogue";

async function queryActiveCategories(): Promise<StoreCategory[]> {
  return medusaCatalogue.listCategories();
}

export const getActiveCategories = unstable_cache(queryActiveCategories, ["medusa-active-categories"], {
  revalidate: 300,
  tags: ["categories", "medusa-categories"],
});
