import assert from "node:assert/strict";
import test from "node:test";
import { createCheckoutService, PAYSTACK_PROVIDER_ID } from "./service";

const cart = { id: "cart_1", email: "buyer@example.com", items: [], shipping_methods: [], region_id: "reg_1" };

test("prepares Ghana address and chooses a real shipping option", async () => {
  const calls: string[] = [];
  const sdk = { cart: {
    update: async (_id: string, body: { shipping_address?: { country_code?: string } }) => { calls.push(`address:${body.shipping_address?.country_code}`); return { cart }; },
    retrieve: async () => ({ cart }),
    addShippingMethod: async (_id: string, body: { option_id: string }) => { calls.push(`shipping:${body.option_id}`); return { cart: { ...cart, shipping_methods: [{ id: "sm_1" }] } }; },
    complete: async () => ({ type: "order" as const, order: { id: "order_1" } }),
  }, fulfillment: { listCartOptions: async () => ({ shipping_options: [{ id: "so_1" }] }) }, payment: { initiatePaymentSession: async () => ({ payment_collection: { payment_sessions: [] } }) } } as never;
  await createCheckoutService(sdk).prepare("cart_1", { email: "buyer@example.com", phone: "+233", address: "Accra" });
  assert.deepEqual(calls, ["address:gh", "shipping:so_1"]);
});

test("initializes Paystack and completes only to a Medusa order", async () => {
  const session = { id: "payses_1", provider_id: PAYSTACK_PROVIDER_ID, data: { access_code: "access" } };
  const paidCart = { ...cart, payment_collection: { payment_sessions: [{ ...session, status: "captured" }] } };
  const sdk = { cart: { retrieve: async () => ({ cart: paidCart }), update: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => ({ type: "order" as const, order: { id: "order_1", display_id: 10 } }) }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: { initiatePaymentSession: async () => ({ payment_collection: { payment_sessions: [session] } }) } } as never;
  const service = createCheckoutService(sdk);
  assert.equal((await service.initiate(cart as never, "card", "https://shop.test/checkout")).accessCode, "access");
  assert.equal((await service.complete("cart_1")).id, "order_1");
});

test("relies on Medusa's own live authorization, not a locally-cached session status", async () => {
  // Medusa's complete-cart workflow authorizes the payment session itself by calling the
  // provider, which live-verifies with Paystack directly — it does not need the cart's
  // local session status to already say "authorized" (that only happens via webhook, which
  // may never reach a local/dev backend). So `complete` must call sdk.cart.complete even
  // when the last-known local status is still "pending".
  let completed = 0;
  const pendingCart = { ...cart, payment_collection: { payment_sessions: [{ id: "payses_1", provider_id: PAYSTACK_PROVIDER_ID, status: "pending" }] } };
  const sdk = { cart: { retrieve: async () => ({ cart: pendingCart }), update: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => { completed += 1; return { type: "order" as const, order: { id: "order_1" } }; } }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: {} } as never;
  const order = await createCheckoutService(sdk).complete("cart_1");
  assert.equal(order.id, "order_1");
  assert.equal(completed, 1);
});

test("surfaces Medusa's own decision when it declines to complete the cart", async () => {
  const sdk = { cart: { retrieve: async () => ({ cart }), update: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => ({ type: "cart" as const, error: { message: "Payment authorization failed" } }) }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: {} } as never;
  await assert.rejects(() => createCheckoutService(sdk).complete("cart_1"), /authorization failed/);
});

test("waitUntilPaid retries Medusa's own live authorization until it succeeds", async () => {
  let attempts = 0;
  const sdk = { cart: { retrieve: async () => ({ cart }), update: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => { attempts += 1; return attempts < 2 ? { type: "cart" as const, error: { message: "Payment authorization failed" } } : { type: "order" as const, order: { id: "order_1" } }; } }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: {} } as never;
  const result = await createCheckoutService(sdk).waitUntilPaid("cart_1", { attempts: 3, sleep: async () => {} });
  assert.equal(result.type, "order");
  assert.equal(attempts, 2);
});

test("passes Mobile Money details through and returns the popup access code like card", async () => {
  let body: Record<string, unknown> | undefined;
  const momoSession = { id: "payses_1", provider_id: PAYSTACK_PROVIDER_ID, data: { access_code: "momo_access" } };
  const sdk = { cart: { retrieve: async () => ({ cart }), update: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => ({}) }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: { initiatePaymentSession: async (_cart: unknown, value: Record<string, unknown>) => { body = value; return { payment_collection: { payment_sessions: [momoSession] } }; } } } as never;
  const result = await createCheckoutService(sdk).initiate(cart as never, "mobile_money", "https://shop.test/checkout", { provider: "mtn", phone: "0240000000" });
  assert.equal(result.accessCode, "momo_access");
  assert.deepEqual((body?.data as Record<string, unknown>).mobile_money, { provider: "mtn", phone: "0240000000" });
});

test("does not fake success when shipping is not configured", async () => {
  const sdk = { cart: { update: async () => ({ cart }), retrieve: async () => ({ cart }), addShippingMethod: async () => ({ cart }), complete: async () => ({}) }, fulfillment: { listCartOptions: async () => ({ shipping_options: [] }) }, payment: {} } as never;
  await assert.rejects(() => createCheckoutService(sdk).prepare("cart_1", { email: "x@y.com", phone: "+233", address: "Accra" }), /No delivery option/);
});
