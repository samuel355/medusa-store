# Begnon Fullstack Roadmap

## Status

Supabase Postgres (schema `medusastore`) is the commerce data source of truth. MedusaJS (`apps/backend`) was the original candidate but is no longer part of the active path.

Done:

1. Storefront reads real products/categories/hero banners from Postgres (`src/lib/db/products.ts`, `categories.ts`, `hero.ts`). No more static catalog data.
2. Cart is server-side (`carts`/`cart_items` tables, cookie-identified), not localStorage.
3. Auth is real Supabase Auth (phone OTP, email/password, Google OAuth) with cookie-based sessions via `@supabase/ssr`, `middleware.ts` route protection, and no demo/bypass accounts.
4. Checkout computes totals server-side from the real cart before calling Paystack — the client never supplies a price. Paystack webhook idempotently transitions `payments`/`orders` exactly once per payment, verified against replayed webhook deliveries.
5. Order history, tracking, wishlist, and notification settings all read/write real tables. No mock fallback arrays remain.
6. Arkesel SMS and Cloudflare R2 storage are wired with real credentials (R2 verified via a live upload; Arkesel wired but not live-tested to avoid sending a real SMS during development).
7. `/admin` is gated by the `medusastore.admin_users` table and shows real orders (with status/fulfillment update) and products.
8. BullMQ workers have a boot script (`src/workers/index.ts`, `npm run workers`) with completed/failed logging and graceful shutdown — verified live against real Redis.
9. Checkout is a dedicated `/checkout` flow with an explicit sign-in-or-guest gate (`AuthPanel` now honors `redirectTo` so login returns the customer to checkout) and native payment UI instead of a full-page redirect: Mobile Money is charged directly via Paystack's Charge API with our own network + phone form (`src/lib/integrations/paystack.ts` `chargeMobileMoney`/`submitChargeOtp`, `/api/paystack/charge`, `/api/paystack/charge/submit-otp`), and card payment uses Paystack InlineJS v2 (`resumeTransaction`) as an on-page popup instead of `checkout.paystack.com`. Order creation is shared between both payment methods via `src/lib/checkout/createPendingOrder.ts`, so totals stay server-computed either way. Verified live against Paystack test-mode keys (Mobile Money `success` path and card `accessCode` issuance both confirmed against the real API and DB).

Open gaps:

1. No customer address book UI (schema has `addresses`, no CRUD yet) — checkout still takes a single free-text delivery address.
2. No product/inventory management UI in `/admin` (list only).
3. No automated test suite (unit tests for adapters/signature verification, Playwright coverage).
4. Discount codes, tax calculation, and multi-address shipping are modeled in the schema but not wired into checkout.
5. The worker process (`npm run workers`) has to be deployed and kept running separately from the Next.js app — there's no auto-start or process-supervisor config for a specific hosting target yet.
6. The Mobile Money `send_otp` and `pay_offline` charge branches are implemented per Paystack's documented Charge API contract but only the immediate-`success` test path has been exercised live — real OTP receipt needs a manual pass with a real (or Paystack test) mobile money number.

## Next steps

1. Add an address book (CRUD) under `/customers/addresses`, feeding real shipping addresses into checkout instead of a single free-text field.
2. Add product create/edit and inventory adjustment to `/admin`.
3. Add unit tests for `src/lib/integrations/paystack.ts` (signature verification, charge helpers) and `src/lib/db/payments.ts` (idempotent transition), plus Playwright coverage for the shop → cart → checkout → webhook flow.
4. Pick a hosting target for the worker process (e.g. a separate Railway/Render service or Docker container) and add its deploy config.
5. Manually verify the Mobile Money OTP and pay-offline prompts end-to-end with a real device.
