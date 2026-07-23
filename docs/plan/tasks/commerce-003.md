---
id: commerce-003
scope: storefront-cart
status: done
depends-on: [commerce-002]
---

# Objective

Replace the custom SQL cart and `/api/cart` implementation with Medusa carts and one shared React Cart Context.

# Context

- `docs/architecture/commerce.md`

# Path

- `src/lib/medusa/cart/`
- `src/lib/utils/cart.ts`
- `src/components/store/`
- `src/components/storefront/`
- `src/app/cart/`

# Requirements

- Create a cart lazily on first cart access using the configured Medusa region.
- Persist only the Medusa cart ID in browser storage; Medusa remains the source of cart truth.
- Provide one React Cart Context above the header and page content.
- Preserve the existing `CartItem`, totals, and cart action contracts used by current UI components during this migration.
- Map Medusa line items and totals through a typed adapter; malformed required data must raise a typed contract error.
- Add, update, and remove operations must use Medusa Store API cart methods and refresh shared state exactly once.
- Header and cart page must consume the same provider state without duplicate initial requests.
- Until `commerce-004` migrates checkout, Medusa cart consumer activation must be controlled by an explicit migration flag that defaults to the operational legacy path. The provider and Medusa service are delivered now; switching the flag is atomic with checkout migration.
- Loading, empty-cart, and mutation-error states must be explicit. Do not silently replace integration failures with an empty cart.
- Do not redesign the header, cart page, or checkout.
- Leave legacy SQL tables and routes intact but unused; removal belongs to `commerce-007`.

# Verification

- Contract tests for cart mapping and missing required fields.
- Cart create/read/add/update/remove tests with an injected SDK boundary.
- Provider tests prove one shared initialization, cart-ID-only persistence, exactly-once accepted mutation state, and handled typed failures.
- Typecheck and browser-visible header/cart consistency.
