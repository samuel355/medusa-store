# Engineering Audit

## Fixed in this pass

- Extracted shared storefront shell components:
  - `StoreHeader`
  - `StoreFooter`
  - `AppShell`
  - `AppHero`
- Centralized currency formatting in `src/lib/utils/money.ts`.
- Refactored homepage and account pages to use the shared shell.
- Pinned package versions instead of using `latest`.
- Preserved successful `typecheck` and production build.

## Current strengths

- Clear Next.js App Router structure.
- Separate integration adapters for Paystack, Supabase, Arkesel, Redis/BullMQ, and R2.
- Supabase SQL schema exists for the full store domain.
- Routes exist for homepage, customers, orders, tracking, settings, and confirmations.
- The app builds without requiring secrets at build time.

## Highest-priority next additions

1. Replace mock data with repository functions.
   - Add `src/lib/repositories/products.ts`.
   - Add `src/lib/repositories/orders.ts`.
   - Read from `medusastore.product_cards` and `medusastore.customer_order_summary`.

2. Add server actions or route handlers for cart operations.
   - Add item to cart.
   - Update quantity.
   - Remove item.
   - Convert cart to order before Paystack initialization.

3. Complete Supabase Auth session handling.
   - Add callback route for Google OAuth.
   - Persist session client-side.
   - Resolve current customer from `medusastore.customers`.

4. Make Paystack idempotent.
   - Store initialized references before redirecting.
   - Reject duplicate webhook processing.
   - Update order/payment status transactionally.

5. ~~Add admin/product management~~ — resolved: `/admin` now redirects recognized store
   admins straight to MedusaJS's own Admin dashboard, which already provides product
   CRUD, image upload, inventory, and order management. No custom Next.js admin UI needed.

6. Add testing.
   - Unit test payment signature verification.
   - Unit test money formatting and order totals.
   - Playwright tests for checkout, login, orders, and tracking.

7. Split CSS by responsibility.
   - Move global tokens/base to `globals.css`.
   - Move reusable layout classes into component-level CSS modules or a structured stylesheet.

8. Add observability.
   - Structured logs for payment webhooks.
   - Queue failure logging.
   - Notification delivery audit trail.
