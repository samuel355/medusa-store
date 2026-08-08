import assert from "node:assert/strict";
import test from "node:test";
import { isValidEmail, isValidGhanaPhone, normalizeGhanaPhone } from "./validation";

test("isValidEmail accepts well-formed addresses and rejects the rest", () => {
  assert.equal(isValidEmail("buyer@example.com"), true);
  assert.equal(isValidEmail(" buyer@example.com "), true);
  assert.equal(isValidEmail("buyer@example"), false);
  assert.equal(isValidEmail("buyer"), false);
  assert.equal(isValidEmail(""), false);
});

test("isValidGhanaPhone accepts 0XXXXXXXXX and +233XXXXXXXXX", () => {
  assert.equal(isValidGhanaPhone("0240000000"), true);
  assert.equal(isValidGhanaPhone("+233240000000"), true);
  assert.equal(isValidGhanaPhone("024 000 0000"), true);
  assert.equal(isValidGhanaPhone("233240000000"), false);
  assert.equal(isValidGhanaPhone("024000000"), false);
  assert.equal(isValidGhanaPhone("+233"), false);
  assert.equal(isValidGhanaPhone(""), false);
});

test("normalizeGhanaPhone converts to 233XXXXXXXXX with no leading +", () => {
  assert.equal(normalizeGhanaPhone("0240000000"), "233240000000");
  assert.equal(normalizeGhanaPhone("024 000 0000"), "233240000000");
  assert.equal(normalizeGhanaPhone("+233240000000"), "233240000000");
  assert.equal(normalizeGhanaPhone("233240000000"), "233240000000");
});
