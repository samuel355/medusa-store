import assert from "node:assert/strict";
import test from "node:test";
import type { HttpTypes } from "@medusajs/types";
import { createCartService, type CartSdkBoundary } from "./service";
import { MedusaCartContractError, MedusaCartOperationError } from "./errors";

const rawCart = {
  id: "cart_1", subtotal: 1000, shipping_total: 0, total: 1000, items: [],
} as unknown as HttpTypes.StoreCart;

test("creates, retrieves, adds, updates and removes through the injected SDK", async () => {
  const calls: string[] = [];
  const response = { cart: rawCart };
  const sdk: CartSdkBoundary = {
    create: async (body) => { calls.push(`create:${body.region_id}`); return response; },
    retrieve: async (id) => { calls.push(`retrieve:${id}`); return response; },
    createLineItem: async (id, body) => { calls.push(`add:${id}:${body.variant_id}:${body.quantity}`); return response; },
    updateLineItem: async (id, lineId, body) => { calls.push(`update:${id}:${lineId}:${body.quantity}`); return response; },
    deleteLineItem: async (id, lineId) => {
      calls.push(`remove:${id}:${lineId}`);
      return { id: lineId, object: "line-item", deleted: true, parent: rawCart } as HttpTypes.StoreLineItemDeleteResponse;
    },
  };
  const service = createCartService(sdk, "reg_1");
  await service.create();
  await service.retrieve("cart_1");
  await service.add("cart_1", "variant_1", 2);
  await service.update("cart_1", "item_1", 3);
  await service.remove("cart_1", "item_1");
  assert.deepEqual(calls, [
    "create:reg_1", "retrieve:cart_1", "add:cart_1:variant_1:2",
    "update:cart_1:item_1:3", "remove:cart_1:item_1",
  ]);
});

test("retains typed contract errors for every cart response boundary", async () => {
  const malformed = { ...rawCart, total: undefined } as unknown as HttpTypes.StoreCart;
  const response = { cart: malformed };
  const sdk: CartSdkBoundary = {
    create: async () => response,
    retrieve: async () => response,
    createLineItem: async () => response,
    updateLineItem: async () => response,
    deleteLineItem: async () => ({ id: "item_1", object: "line-item", deleted: true, parent: malformed }) as HttpTypes.StoreLineItemDeleteResponse,
  };
  const service = createCartService(sdk, "reg_1");
  const operations = [
    () => service.create(), () => service.retrieve("cart_1"), () => service.add("cart_1", "variant_1", 1),
    () => service.update("cart_1", "item_1", 2), () => service.remove("cart_1", "item_1"),
  ];
  for (const operation of operations) {
    await assert.rejects(operation(), (error) => error instanceof MedusaCartContractError && error.field === "cart.total");
  }
});

test("retains operation and cause for every Store API failure", async () => {
  const cause = new Error("offline");
  const fail = async () => { throw cause; };
  const sdk: CartSdkBoundary = {
    create: fail, retrieve: fail, createLineItem: fail, updateLineItem: fail, deleteLineItem: fail,
  };
  const service = createCartService(sdk, "reg_1");
  const operations: Array<[() => Promise<unknown>, string]> = [
    [() => service.create(), "create"], [() => service.retrieve("cart_1"), "retrieve"],
    [() => service.add("cart_1", "variant_1", 1), "add line item"],
    [() => service.update("cart_1", "item_1", 2), "update line item"],
    [() => service.remove("cart_1", "item_1"), "remove line item"],
  ];
  for (const [operation, name] of operations) {
    await assert.rejects(operation(), (error) => error instanceof MedusaCartOperationError && error.operation === name && error.cause === cause);
  }
});
