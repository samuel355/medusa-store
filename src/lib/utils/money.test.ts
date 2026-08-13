import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, toAmount } from "./money";

test("toAmount coerces non-numeric Medusa money values to a safe fallback", () => {
  assert.equal(toAmount(45), 45);
  assert.equal(toAmount("45.5"), 45.5);
  assert.equal(toAmount(undefined), 0);
  assert.equal(toAmount(null), 0);
  assert.equal(toAmount(Number.NaN), 0);
  assert.equal(toAmount(undefined, 12), 12);
});

test("formatMoney never renders NaN for a missing or non-numeric amount", () => {
  assert.doesNotMatch(formatMoney(undefined as never), /NaN/);
  assert.doesNotMatch(formatMoney(null as never), /NaN/);
  assert.match(formatMoney(45), /45/);
});
