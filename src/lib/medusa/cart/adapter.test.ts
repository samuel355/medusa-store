import assert from "node:assert/strict";
import test from "node:test";
import type { HttpTypes } from "@medusajs/types";
import { mapMedusaCart } from "./adapter";
import { MedusaCartContractError } from "./errors";

function cart(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart_1", subtotal: 2000, shipping_total: 200, total: 2200,
    items: [{
      id: "item_1", variant_id: "variant_1", quantity: 2, unit_price: 1000, total: 2000,
      thumbnail: "https://example.com/image.jpg", title: "Shirt",
      product: { id: "prod_1", handle: "shirt", title: "Shirt" },
      variant: { product_id: "prod_1", options: [] },
    }],
    ...overrides,
  } as unknown as HttpTypes.StoreCart;
}

test("maps Medusa cart to the existing storefront contract", () => {
  const result = mapMedusaCart(cart());
  assert.equal(result.id, "cart_1");
  assert.equal(result.items[0]?.variantId, "variant_1");
  assert.equal(result.totals.quantity, 2);
  assert.equal(result.totals.total, 2200);
});

test("raises a typed contract error for missing required data", () => {
  assert.throws(() => mapMedusaCart(cart({ total: undefined })), (error) =>
    error instanceof MedusaCartContractError && error.field === "cart.total");
});

test("does not silently treat missing line items as an empty cart", () => {
  assert.throws(() => mapMedusaCart(cart({ items: undefined })), (error) =>
    error instanceof MedusaCartContractError && error.field === "cart.items");
});
