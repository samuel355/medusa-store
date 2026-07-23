import assert from "node:assert/strict";
import test from "node:test";

import {
  MedusaConfigurationError,
  resolveMedusaConfig,
} from "./config";

const validEnvironment = {
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://localhost:9000/",
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_test",
  NEXT_PUBLIC_MEDUSA_REGION_ID: "reg_test",
};

test("resolves and normalizes complete Medusa configuration", () => {
  assert.deepEqual(resolveMedusaConfig(validEnvironment), {
    backendUrl: "http://localhost:9000",
    publishableKey: "pk_test",
    regionId: "reg_test",
  });
});

for (const key of Object.keys(validEnvironment) as Array<
  keyof typeof validEnvironment
>) {
  test(`fails fast when ${key} is missing`, () => {
    const environment = { ...validEnvironment, [key]: "" };

    assert.throws(
      () => resolveMedusaConfig(environment),
      (error: unknown) =>
        error instanceof MedusaConfigurationError && error.key === key,
    );
  });
}

test("rejects a non-http backend URL", () => {
  assert.throws(
    () =>
      resolveMedusaConfig({
        ...validEnvironment,
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: "file:///tmp/medusa",
      }),
    MedusaConfigurationError,
  );
});
