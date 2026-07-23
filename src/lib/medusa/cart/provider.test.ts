import assert from "node:assert/strict";
import test from "node:test";
import type { CartResponse } from "@/lib/utils/cart";
import { isMedusaCartEnabled } from "./config";
import { createCartController, type CartDataSource } from "./controller";
import { MedusaCartContractError, MedusaCartOperationError } from "./errors";
import { createMedusaCartDataSource } from "./data-source";

const empty = (id = "cart_1"): CartResponse => ({ id, items: [], totals: { quantity: 0, subtotal: 0, shipping: 0, total: 0 } });

function source(overrides: Partial<CartDataSource> = {}): CartDataSource {
  return {
    initialize: async () => empty(),
    add: async () => empty("cart_added"),
    update: async () => empty("cart_updated"),
    remove: async () => empty("cart_removed"),
    ...overrides,
  };
}

test("shared consumers trigger exactly one provider initialization", async () => {
  let initializations = 0;
  const controller = createCartController(source({ initialize: async () => { initializations += 1; return empty(); } }));
  await Promise.all([controller.initialize(), controller.initialize()]);
  assert.equal(initializations, 1);
});

test("Medusa mode persists only the returned cart ID", async () => {
  const writes: Array<[string, string]> = [];
  const storage = { getItem: () => null, setItem: (key: string, value: string) => writes.push([key, value]), removeItem: () => {} };
  const service = {
    create: async () => empty(), retrieve: async () => empty(),
    add: async () => empty("cart_2"), update: async () => empty("cart_3"), remove: async () => empty("cart_4"),
  };
  const dataSource = createMedusaCartDataSource(storage, service);
  await dataSource.initialize();
  await dataSource.add("variant_1", 1);
  assert.deepEqual(writes, [
    ["begnon_medusa_cart_id", "cart_1"],
    ["begnon_medusa_cart_id", "cart_2"],
  ]);
});

test("accepts each mutation response once without a redundant retrieve", async () => {
  let retrieves = 0;
  let adds = 0;
  const accepted: string[] = [];
  let previousCartId: string | null = null;
  const controller = createCartController(source({
    initialize: async () => { retrieves += 1; return empty(); },
    add: async () => { adds += 1; return empty("cart_after_add"); },
  }));
  controller.subscribe((state) => {
    if (state.cart.id !== previousCartId) {
      previousCartId = state.cart.id;
      if (state.cart.id === "cart_after_add") accepted.push(state.cart.id);
    }
  });
  await controller.initialize();
  await controller.add("variant_1", 1);
  assert.equal(retrieves, 1);
  assert.equal(adds, 1);
  assert.deepEqual(accepted, ["cart_after_add"]);
});

test("checkout reset clears persisted identity and publishes one fresh cart", async () => {
  const removed: string[] = [];
  const storage = { getItem: () => "cart_old", setItem: () => {}, removeItem: (key: string) => removed.push(key) };
  const dataSource = createMedusaCartDataSource(storage, { create: async () => empty("cart_fresh"), retrieve: async () => empty("cart_old"), add: async () => empty(), update: async () => empty(), remove: async () => empty() });
  const controller = createCartController(dataSource);
  await controller.initialize();
  const fresh = await controller.reset();
  assert.equal(fresh.id, "cart_fresh");
  assert.deepEqual(removed, ["begnon_medusa_cart_id"]);
});

test("retains typed loading and mutation failures without replacing cart state", async () => {
  const loadingError = new MedusaCartOperationError("retrieve", new Error("offline"));
  const loading = createCartController(source({ initialize: async () => { throw loadingError; } }));
  await assert.rejects(loading.initialize(), (error) => error === loadingError);
  assert.equal(loading.getState().error, loadingError);

  const mutationError = new MedusaCartContractError("cart.total");
  const mutation = createCartController(source({ add: async () => { throw mutationError; } }));
  await mutation.initialize();
  await assert.rejects(mutation.add("variant_1"), (error) => error === mutationError);
  assert.equal(mutation.getState().error, mutationError);
  assert.equal(mutation.getState().cart.id, "cart_1");
});

test("legacy compatibility is the default until explicitly enabled", () => {
  assert.equal(isMedusaCartEnabled({}), false);
  assert.equal(isMedusaCartEnabled({ NEXT_PUBLIC_MEDUSA_CART_ENABLED: "false" }), false);
  assert.equal(isMedusaCartEnabled({ NEXT_PUBLIC_MEDUSA_CART_ENABLED: "true" }), true);
});
