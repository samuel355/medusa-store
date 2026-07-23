---
id: commerce-006
scope: orders-notifications
status: pending
depends-on: [commerce-004, commerce-005]
---

# Objective

Read customer orders from Medusa and send Arkesel notifications through Medusa event subscribers.

# Context

- `docs/architecture/commerce.md`

# Path

- `apps/backend/src/subscribers/`
- `src/app/orders/`
- `src/app/tracking/`
- `src/lib/integrations/arkesel.ts`

# Verification

- Subscriber tests and order-history/tracking integration tests.

