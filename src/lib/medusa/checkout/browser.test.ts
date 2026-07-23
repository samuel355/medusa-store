import assert from "node:assert/strict";
import test from "node:test";
import { finalizeVerifiedCheckout } from "./browser";

test("browser handoff verifies before complete, clears and refreshes exactly once, then redirects with Medusa ID", async () => {
  const events: string[] = [];
  const order = await finalizeVerifiedCheckout({
    cartId: "cart_1",
    waitUntilPaid: async () => { events.push("verified"); },
    complete: async () => { events.push("completed"); return { id: "order_1" }; },
    clearPending: () => events.push("cleared"),
    resetAfterCheckout: async () => { events.push("reset"); },
    redirect: (id) => events.push(`redirect:${id}`),
  });
  assert.equal(order.id, "order_1");
  assert.deepEqual(events, ["verified", "completed", "cleared", "reset", "redirect:order_1"]);
});

test("browser handoff never completes or clears while verification is pending", async () => {
  let completed = 0;
  let cleared = 0;
  await assert.rejects(() => finalizeVerifiedCheckout({ cartId: "cart_1", waitUntilPaid: async () => { throw new Error("pending"); }, complete: async () => { completed += 1; return { id: "order_1" }; }, clearPending: () => { cleared += 1; }, resetAfterCheckout: async () => {}, redirect: () => {} }), /pending/);
  assert.equal(completed, 0);
  assert.equal(cleared, 0);
});
