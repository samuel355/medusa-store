---
id: commerce-005
scope: customer-identity
status: pending
depends-on: [commerce-003]
---

# Objective

Consolidate storefront customer authentication and account reads around Medusa while preserving explicit identity migration rules.

# Context

- `docs/architecture/commerce.md`

# Path

- `src/lib/auth/`
- `src/app/login/`
- `src/app/register/`
- `src/app/customers/`
- `apps/backend/src/`

# Verification

- Registration, login, guest-cart association, logout, and protected-route tests.

