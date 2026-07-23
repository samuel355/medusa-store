import assert from "node:assert/strict";
import test from "node:test";

import { MedusaIntegrationError } from "../errors";
import { createCatalogueAdapter } from "./adapter";
import { MedusaCatalogueContractError } from "./errors";
import type { CatalogueStoreClient } from "./types";

test("wraps Store API product failures with the catalogue operation", async () => {
  const cause = new Error("backend unavailable");
  const client = {
    product: { list: async () => { throw cause; } },
    category: { list: async () => ({ product_categories: [], count: 0, offset: 0, limit: 100 }) },
  } as CatalogueStoreClient;
  const adapter = createCatalogueAdapter(client, "reg_1");

  await assert.rejects(
    adapter.listProducts(),
    (error) => error instanceof MedusaIntegrationError && error.operation === "list storefront products" && error.cause === cause,
  );
});

test("wraps Store API category failures with the catalogue operation", async () => {
  const cause = new Error("backend unavailable");
  const client = {
    product: { list: async () => ({ products: [], count: 0, offset: 0, limit: 100 }) },
    category: { list: async () => { throw cause; } },
  } as CatalogueStoreClient;
  const adapter = createCatalogueAdapter(client, "reg_1");

  await assert.rejects(
    adapter.listCategories(),
    (error) => error instanceof MedusaIntegrationError && error.operation === "list storefront categories" && error.cause === cause,
  );
});

test("terminates exhaustive pagination when a later page is empty", async () => {
  const offsets: number[] = [];
  const product = {
    id: "prod_1",
    title: "Shirt",
    handle: "shirt",
    variants: [{ id: "variant_1", calculated_price: { calculated_amount: 10 } }],
  };
  const client = {
    product: { list: async (query: { offset?: number }) => {
      offsets.push(query.offset ?? 0);
      return query.offset === 0
        ? { products: [product], count: 2, offset: 0, limit: 100 }
        : { products: [], count: 2, offset: 1, limit: 100 };
    } },
    category: { list: async () => ({ product_categories: [], count: 0, offset: 0, limit: 100 }) },
  } as unknown as CatalogueStoreClient;

  const products = await createCatalogueAdapter(client, "reg_1").listProducts();
  assert.equal(products.length, 1);
  assert.deepEqual(offsets, [0, 1]);
});

test("preserves caller product pagination bounds and filters", async () => {
  const requests: unknown[] = [];
  const client = {
    product: { list: async (query: unknown) => {
      requests.push(query);
      return { products: [], count: 20, offset: 7, limit: 1 };
    } },
    category: { list: async () => ({ product_categories: [], count: 0, offset: 0, limit: 100 }) },
  } as CatalogueStoreClient;

  await createCatalogueAdapter(client, "reg_1").listProducts({ handle: "shirt", limit: 1, offset: 7 });
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    handle: "shirt",
    limit: 1,
    offset: 7,
    region_id: "reg_1",
    fields: "+variants.inventory_quantity,*variants.calculated_price,*variants.options,*categories,*images,*collection",
  });
});

test("preserves catalogue contract errors raised while mapping", async () => {
  const client = {
    product: { list: async () => ({
      products: [{ id: "prod_1", title: "Broken", handle: "broken", variants: [] }],
      count: 1,
      offset: 0,
      limit: 1,
    }) },
    category: { list: async () => ({ product_categories: [], count: 0, offset: 0, limit: 100 }) },
  } as unknown as CatalogueStoreClient;

  await assert.rejects(
    createCatalogueAdapter(client, "reg_1").listProducts({ limit: 1 }),
    MedusaCatalogueContractError,
  );
});
