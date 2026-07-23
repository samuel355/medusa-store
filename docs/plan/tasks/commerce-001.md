---
id: commerce-001
scope: storefront-medusa-sdk
status: done
depends-on: []
---

# Objective

Establish a typed, fail-fast Medusa Store SDK foundation without changing any existing page data source or UI.

# Context

- `docs/INDEX.md`
- `docs/architecture/commerce.md`
- `docs/plan/analysis/medusa-commerce-migration.md`

# Path

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/lib/medusa/`
- `src/lib/medusa/*.test.ts`
- `docs/architecture/commerce.md`

# Requirements

- Install compatible `@medusajs/js-sdk` and `@medusajs/types` packages.
- Define and validate backend URL, publishable key, and region ID configuration.
- Export one SDK singleton suitable for server and browser Store API calls.
- Define a typed `MedusaIntegrationError` that retains operation and cause.
- Add a health/connectivity function that performs a minimal Store API read and does not hide configuration or network failures.
- Do not modify storefront pages, carts, checkout, authentication, or direct SQL modules in this task.

# Verification

- `npm run typecheck`
- Unit tests cover missing configuration and integration-error behavior.
- A connectivity check against the configured local Medusa backend succeeds when it is running; otherwise record the external blocker without adding a fallback.
