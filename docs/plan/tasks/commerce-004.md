---
id: commerce-004
scope: medusa-checkout-paystack
status: blocked
depends-on: [commerce-003]
---

# Objective

Move shipping, checkout, Paystack payment state, and order completion into Medusa workflows and a Paystack payment provider.

# Context

- `docs/architecture/commerce.md`

# Path

- `apps/backend/medusa-config.ts`
- `apps/backend/.env.template`
- `apps/backend/src/modules/`
- `apps/backend/src/workflows/`
- `apps/backend/src/api/`
- `apps/backend/src/migration-scripts/`
- `src/lib/medusa/checkout/`
- `src/lib/medusa/cart/`
- `src/app/checkout/`
- `src/components/storefront/CheckoutFlow.tsx`
- `.env.example`

# Requirements

- Implement Paystack as a Medusa Payment Module provider extending `AbstractPaymentProvider`; do not create a parallel payment/order record in Next.js.
- Implement initialization, authorization, capture, refund, cancellation, retrieval, update, deletion, and webhook action mapping with typed provider errors.
- Verify Paystack webhook signatures with the raw body and constant-time comparison. A valid `charge.success` event must map to the Medusa payment session and be idempotent.
- Never expose `PAYSTACK_SECRET_KEY` to the storefront. Provider configuration must fail fast when required backend configuration is absent.
- Use Medusa payment collections/sessions and `sdk.store.payment.initiatePaymentSession`; complete orders with `sdk.store.cart.complete` only after the provider reports authorization or capture.
- Update the Medusa cart with guest/customer email and Ghana shipping address. Select an actual Medusa shipping option before payment.
- Preserve Mobile Money OTP/approval and card popup user flows where Paystack supports them, but route state through the Medusa payment session.
- On successful completion, remove the Medusa cart ID, refresh shared cart state, and redirect using the Medusa order ID/display ID.
- Confirmation and tracking must receive a stable Medusa order identifier; compatibility reads may remain until `commerce-006`, but no new legacy order may be created.
- Enable the Paystack provider for the Ghana/GHS region through a repeatable setup script or workflow.
- Switch `NEXT_PUBLIC_MEDUSA_CART_ENABLED` to true only after cart-to-order integration tests pass. The switch and checkout migration are atomic.
- Do not send a real charge, OTP, SMS, capture, or refund during automated verification.
- Preserve current checkout layout and CSS classes; this is a data/workflow migration, not a redesign.

# Verification

- Provider contract tests cover every required operation, typed failures, idempotency, signature validation, and webhook mapping.
- Storefront checkout tests cover address, shipping option, payment initiation, additional-action states, cart completion, and cart-ID cleanup.
- A non-charging integration test uses the configured Medusa backend and Paystack test-mode initialization boundary.
- `npm run typecheck`, root unit tests, backend unit tests, backend build, and storefront production build.

## Current verification state (2026-07-17)

- The Paystack provider and storefront checkout contracts are implemented behind the existing disabled migration flag.
- Root checkout/cart/catalogue unit tests pass. Root and backend TypeScript compilation pass.
- Atomic activation is intentionally blocked: the configured backend was not running at `localhost:9000`, and no Paystack test secret was available to verify provider registration, GHS-region association, a real shipping option, and a non-charging Paystack initialization response.
- Backend Jest is also blocked before test discovery by the repository's missing `apps/backend/integration-tests/setup.js` referenced from Jest configuration.
- `NEXT_PUBLIC_MEDUSA_CART_ENABLED` remains `false`; run the repeatable `npm --prefix apps/backend run setup:paystack` only with a configured test key and backend, then complete the required non-charging integration gate before changing it.

### Review-fix update (2026-07-18)

- Cart completion now independently requires an authorized/captured Medusa payment session. Popup success and redirect returns only start resumable verification; neither is treated as payment proof.
- Mobile Money network and phone are retained in the payment-session/provider metadata. A Paystack response requiring OTP is rejected with a typed unsupported-action error instead of bypassing provider ownership.
- Successful handoff clears pending identity, resets the shared cart exactly once, and redirects with a Medusa order ID. Confirmation/tracking compatibility reads map that ID into the existing UI contract.
- Root tests pass 37/37; provider Jest tests pass 9/9; root/backend TypeScript and `git diff --check` pass.
- Activation is still blocked: the configured backend at `localhost:9000` refused the read-only health/region/provider checks, and no confirmed `sk_test_` key is configured in `apps/backend/.env`. Provider-region-shipping association and the safe non-charging initialization gate therefore remain unproven.

### Redis workflow-gate update (2026-07-18)

- Live cart line-item and shipping mutations stalled while Redis event/cache/locking clients logged connection timeouts. Redis-backed Medusa modules are now opt-in through `MEDUSA_REDIS_ENABLED=true`; local development uses Medusa's built-in providers when the flag is false or absent.
- Explicit Redis activation fails fast without `REDIS_URL`. Operators must disable the flag when Redis is unhealthy before restarting; silent runtime fallback is intentionally avoided because switching lock providers inside a running multi-instance deployment is unsafe.
- The Paystack/cart activation flag remains false until the disposable line-item, Ghana shipping, and non-charging initialization checks succeed on the corrected backend configuration.
- Post-fix live verification succeeded through the non-charging boundary: the provider was listed for GHS, a published variant persisted on a disposable cart, a Ghana address and one of two real shipping options persisted, and Paystack returned a pending Medusa session with a redacted access code and authorization URL.
- Activation remains blocked and `NEXT_PUBLIC_MEDUSA_CART_ENABLED` remains false because signed webhook advancement, authorized cart completion, single Medusa order creation, and absence of legacy persistence have not yet been proven.

### Permissioned live-gate update (2026-07-18)

- Both storefront and backend environments contain confirmed Paystack test-mode keys; values were never printed.
- The repeatable setup script completed successfully and enabled `pp_paystack_paystack` for GHS region `reg_01KXNNQMGFY0BS50Y7KNYAM1JY`.
- A current backend process was started and `/health` returns HTTP 200.
- The region-scoped Store API payment-provider request timed out after 15 seconds with no response body. Startup also reported Redis connection timeout/closure errors, so the commerce request path is not healthy enough to prove provider visibility, shipping, or safe payment-session initialization.
- No payment session, authorization, order completion, charge, OTP, SMS, capture, or refund was performed. `NEXT_PUBLIC_MEDUSA_CART_ENABLED` remains false.

### Store API retry (2026-07-18)

- The region-scoped provider endpoint recovered and returned `pp_paystack_paystack`.
- A disposable Medusa cart was created successfully in the configured GHS region.
- The cart accepted a test Ghana address and the Store API returned two applicable shipping options.
- Repeated attempts to attach the selected shipping option returned no usable response; retrieving the cart still reported zero shipping methods.
- Payment-session initialization was not attempted because an attached shipping method is a required checkout invariant. No authorization or financial operation occurred, and the activation flag remains false.
