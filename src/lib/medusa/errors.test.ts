import assert from "node:assert/strict";
import test from "node:test";

import { MedusaIntegrationError } from "./errors";

test("retains the failed operation and original cause", () => {
  const cause = new Error("connection refused");
  const error = new MedusaIntegrationError("retrieve region reg_test", cause);

  assert.equal(error.name, "MedusaIntegrationError");
  assert.equal(error.operation, "retrieve region reg_test");
  assert.equal(error.cause, cause);
  assert.match(error.message, /retrieve region reg_test/);
});
