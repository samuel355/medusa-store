# Engineering Audit

## 2026-08-11 full-stack review

Reviewed auth/middleware, checkout/payment/webhooks, the data access layer
(Supabase legacy + Medusa), frontend structure, backend Medusa modules and
workers, and testing/deploy config. Findings below, grouped by what happened
to them.

### Fixed in this pass

- **`render.yaml` pinned the Medusa backend to a schema that no longer
  exists.** `DATABASE_SCHEMA` was hardcoded to `medusastore`; the schema was
  renamed to `begnon` in `32f8ec4` and `medusa-config.ts` already defaults to
  `"begnon"`, but this file's explicit value would have overridden that
  default on any fresh Render deploy. Fixed to `begnon`. Also removed the
  `PAYSTACK_WEBHOOK_SECRET` env declaration — it isn't read anywhere in
  `apps/backend`; webhook signatures are verified with `PAYSTACK_SECRET_KEY`
  (see `paystack-payment/service.ts`), so the unused var only invited someone
  to (wrongly) think it needed to be configured separately.
- **README described infrastructure that no longer runs in production.** It
  still referenced `database/supabase/medusastore_schema.sql` and
  `medusastore.admin_users` (same rename as above), and said the BullMQ
  worker process "must be running for order fulfillment status updates and
  Arkesel SMS notifications to actually happen." That's only true for the
  legacy, non-Medusa checkout fallback (`NEXT_PUBLIC_MEDUSA_CART_ENABLED=false`).
  The live checkout path's fulfillment/SMS/email now runs entirely through
  Medusa's own subscribers (`apps/backend/src/subscribers/`) on its
  in-process event bus — zero Redis involvement (see `6b4ad55`, which
  dropped the Redis-backed event bus specifically because its background
  polling was exhausting the Redis quota). Also fixed a similar staleness in
  the Google OAuth env var description: the app is now the OAuth client
  itself (`googleOAuth.ts`), not routed through Supabase's hosted broker.
- **No rate limiting on `/api/auth/phone-otp` or `/api/auth/email-password`.**
  Added a shared in-memory sliding-window limiter (`src/lib/utils/rateLimit.ts`)
  and applied it: phone-otp send capped per-IP (SMS toll-fraud guard, on top
  of the existing per-phone 60s cooldown), phone-otp verify capped per-IP
  (brute-force guard, on top of the existing per-phone attempt cap),
  email-password capped per-IP (credential-stuffing guard — deliberately
  per-IP, not per-email, so it can't be used to lock out a victim's account).
  In-memory is sufficient here because this app runs as a long-lived Node
  process (see `render.yaml`/`railway.json`), not isolated serverless
  functions; it just won't coordinate across instances if ever scaled
  horizontally.
- **`GET /api/orders/[orderNumber]` and its `reorder` sibling had no rate
  limiting at all.** Added the same per-IP limiter. This matters most for
  the legacy checkout fallback's order-number format (`SOB-<ms
  timestamp><3 random digits>` in `lib/db/orders.ts`), which has far less
  entropy than a Medusa order ID and shouldn't be brute-forceable even
  though guessing it in practice still requires the exact placement
  millisecond, not just a date/time window.

### Investigated, found to be by design (not fixed)

- **`GET /api/orders/[orderNumber]` has no ownership/session check.** My
  first pass through this flagged it as an IDOR. On closer inspection it
  isn't one: the confirmation and tracking pages pass Medusa's full
  `order_<ulid>` id (`checkout/browser.ts: input.redirect(order.id)`), not
  the short human-facing display number, so the URL itself functions as a
  ~80-bit-random bearer capability — the same pattern Stripe/Shopify use for
  guest order links, and it's exactly what lets a guest with no account see
  their own just-placed order. `next.config.mjs` already sets
  `Referrer-Policy: strict-origin-when-cross-origin`, so the order-bearing
  path never leaks to third-party origins via referrer, and there's no
  analytics/tracking script on these pages that would log the full URL.
  Requiring a session or the `/api/orders/track` contact check here would
  break guest checkout confirmation entirely, so left as is — now with a
  comment on the route explaining why, so it doesn't get "fixed" into a
  worse state by someone (including a future me) who doesn't check first.

### Deferred — tracked as its own migration task, not touched here

- **Two live checkout implementations.** `CheckoutFlow.tsx` still contains
  a full legacy Paystack/Supabase checkout path (`/api/checkout`,
  `/api/paystack/charge`, `/api/paystack/charge/submit-otp`,
  `/api/paystack/webhook`) alongside the Medusa path, switched by
  `NEXT_PUBLIC_MEDUSA_CART_ENABLED`. This is intentional and documented
  (`docs/architecture/commerce.md`: "the legacy data source ... remains
  only as a fallback until `commerce-007` removes it"), not something to
  delete unilaterally in a review pass — but it's real live attack surface
  (a second Paystack secret-key usage, a second webhook signature check, a
  second order-creation path) for as long as it exists. Prioritizing
  `commerce-007` removes this entirely rather than requiring ongoing
  parallel maintenance/hardening of a path meant to be deleted.

## 2026 earlier pass

### Fixed in that pass

- Extracted shared storefront shell components:
  - `StoreHeader`
  - `StoreFooter`
  - `AppShell`
  - `AppHero`
- Centralized currency formatting in `src/lib/utils/money.ts`.
- Refactored homepage and account pages to use the shared shell.
- Pinned package versions instead of using `latest`.
- Preserved successful `typecheck` and production build.

### Current strengths

- Clear Next.js App Router structure.
- Separate integration adapters for Paystack, Supabase, Arkesel, Redis/BullMQ, and R2.
- Supabase SQL schema exists for the full store domain, with comprehensive RLS policies.
- Routes exist for homepage, customers, orders, tracking, settings, and confirmations.
- The app builds without requiring secrets at build time.
- Paystack webhook/HMAC verification is done correctly (timing-safe compare,
  length check before comparison) in both the legacy route and the Medusa
  payment provider; the Medusa provider always re-verifies payment status
  against Paystack's API rather than trusting client-reported success.
- Real unit test coverage on the Medusa migration surface: cart
  adapter/provider/service, catalogue adapter/mapper, checkout
  browser/service, orders, config.

### Next additions worth prioritizing

1. `commerce-007`: remove the legacy Supabase/Paystack checkout path now
   that the Medusa path is the live default, to stop maintaining two
   checkout implementations.
2. Extend unit/integration test coverage to the auth flows (phone OTP,
   Google OAuth, email/password) and the API route layer generally — current
   coverage is concentrated on the Medusa migration surface.
3. Add testing.
   - Unit test payment signature verification.
   - Unit test money formatting and order totals.
   - Playwright tests for checkout, login, orders, and tracking.
4. Add observability.
   - Structured logs for payment webhooks.
   - Queue failure logging.
   - Notification delivery audit trail.
