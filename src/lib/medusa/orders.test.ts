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
