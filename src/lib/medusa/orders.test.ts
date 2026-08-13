import assert from "node:assert/strict";
import test from "node:test";
import { mapMedusaOrder } from "./orders";

test("maps a Medusa order ID into the existing confirmation and tracking contract", () => {
  const mapped = mapMedusaOrder({
    id: "order_1", display_id: 42, status: "pending", payment_status: "captured", fulfillment_status: "not_fulfilled",
    total: 120, subtotal: 110, shipping_total: 10, currency_code: "ghs", created_at: "2026-07-18T00:00:00.000Z", email: "buyer@example.com",
    items: [{ title: "Shirt", variant_sku: "SHIRT", quantity: 2, unit_price: 55, total: 110 }],
    shipping_address: { phone: "+233", address_1: "Osu", city: "Accra", country_code: "gh" },
  } as never);
  assert.equal(mapped.id, "order_1");
  assert.equal(mapped.orderNumber, "42");
  assert.equal(mapped.paymentStatus, "paid");
  assert.equal(mapped.items[0].title, "Shirt");
});

test("derives the total from line items + shipping when order.total lags behind them", () => {
  // Reported bug: a customer paid for items + shipping but the confirmation
  // page showed only the shipping fee - order.total/subtotal can still be
  // mid-computation moments after checkout completes.
  const mapped = mapMedusaOrder({
    id: "order_1", display_id: 42, status: "pending", payment_status: "captured", fulfillment_status: "not_fulfilled",
    total: 55, subtotal: 0, shipping_total: 55, currency_code: "ghs", created_at: "2026-07-18T00:00:00.000Z", email: "buyer@example.com",
    items: [{ title: "Shirt", variant_sku: "SHIRT", quantity: 2, unit_price: 55, total: 110 }],
    shipping_address: { phone: "+233", address_1: "Osu", city: "Accra", country_code: "gh" },
  } as never);
  assert.equal(mapped.total, 165);
  assert.equal(mapped.subtotal, 110);
});

test("never renders as NaN when order/item money fields are missing", () => {
  const mapped = mapMedusaOrder({
    id: "order_1", display_id: 42, status: "pending", payment_status: "pending", fulfillment_status: "not_fulfilled",
    currency_code: "ghs", created_at: "2026-07-18T00:00:00.000Z", email: "buyer@example.com",
    items: [{ title: "Shirt", variant_sku: "SHIRT", quantity: 1 }],
    shipping_address: { phone: "+233", address_1: "Osu", city: "Accra", country_code: "gh" },
  } as never);
  assert.equal(Number.isFinite(mapped.total), true);
  assert.equal(Number.isFinite(mapped.items[0].lineTotal), true);
});
