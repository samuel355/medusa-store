# commerce-004 verification review 02

## Conclusion

**Code review passes; activation remains blocked only on the live external integration gate.** All five findings from review 01 are resolved in implementation and automated contract coverage. `NEXT_PUBLIC_MEDUSA_CART_ENABLED` still resolves to `false` (absent in `.env.local`, explicitly false in `.env.example`) and must remain false until the non-charging test-mode integration is proven against the configured Medusa environment.

## Resolution of review 01 findings

1. **Authorization/capture gate and resumable completion — resolved.** Checkout now stores a pending cart resume key, handles Paystack popup success, authorization-URL return, and approval-only states through the same verification path. `waitUntilPaid` polls Medusa's payment session and accepts only `authorized` or `captured`; `complete` independently re-checks that state before calling `sdk.store.cart.complete`. Pending/error/canceled sessions cannot complete a cart. Browser and service tests assert ordering and the no-premature-completion invariant.

2. **Mobile Money input and additional actions — resolved at the code boundary, live behavior still part of the external gate.** The selected Ghana network and phone are passed into the Medusa payment session and retained in Paystack metadata. Hosted Paystack access-code/authorization flows preserve provider-owned approval and OTP UX. If a direct `send_otp` session is returned, the storefront fails safely instead of bypassing Medusa or falling back to the legacy OTP endpoint. Tests cover data propagation and that fail-safe. Whether Paystack's test-mode hosted flow accepts each Ghana network is a live integration question, not an outstanding code defect.

3. **Shared cart cleanup — resolved.** `CartProvider` exposes `resetAfterCheckout`; the Medusa data source clears the completed cart ID, creates/persists a fresh cart, and publishes it through the shared controller. Finalization clears the pending checkout marker, resets shared state exactly once, then redirects. Tests cover the storage and event sequence.

4. **Medusa order handoff — resolved.** The order API now falls back from legacy order lookup to Medusa Store API retrieval for `order_*` identifiers and maps Medusa orders into the existing confirmation/tracking contract. Checkout redirects with the stable Medusa order ID. Mapping coverage verifies display ID, payment status, items, totals, and address compatibility.

5. **Test/discovery coverage — resolved for code contracts.** Backend Jest discovery is restored with the missing setup entrypoint. Provider tests now cover initialization and de-duplication, signed success repetition, failed/unsupported webhook mapping, retrieval, authorization, successful and rejected capture, cancel, delete, update, refund, typed upstream failure, and missing-secret validation. Storefront tests cover shipping/address, payment initiation, Mobile Money details and unsupported OTP safety, polling, payment gating, cart cleanup/reset, redirect handoff, and order mapping.

## Safety and architecture checks

- The new Medusa branch does not call `createOrderFromCart`, the legacy checkout routes, or legacy payment persistence. The only order creation is `sdk.store.cart.complete` after Medusa payment verification.
- `PAYSTACK_SECRET_KEY` remains backend provider configuration. The storefront receives only session data needed by Paystack Inline; it does not import or read the backend secret.
- Webhook verification still uses the raw request body, HMAC-SHA512, equal-length validation, and constant-time comparison. Repeated valid events produce the same Medusa action/session/amount mapping; Medusa owns state transition idempotency.
- The GHS-region setup script remains repeatable: it preserves existing providers, de-duplicates the Paystack provider ID, and fails if no GHS region exists.
- No real Paystack initialization, charge, OTP, capture, refund, SMS, setup script, or database mutation was performed in this review.

## Verification evidence

- Root unit tests: **37/37 pass**.
- Root TypeScript: **pass**.
- Backend TypeScript: **pass**.
- Backend provider Jest suite: **9/9 pass** with `--no-watchman`.
- Default backend test script: code discovery is fixed, but Watchman cannot create its state directory under the filesystem sandbox. This is an environment/tooling issue; the identical Jest suite passes with Watchman disabled.
- Storefront production build: **pass**, including TypeScript and static page generation.
- Backend production build: **pass**, backend and Admin/frontend phases.
- Backend health endpoint: **200**.
- `git diff --check`: **pass**.

## Remaining external activation gate

The code cannot be activated until a confirmed disposable Paystack **test** secret and the intended Medusa environment are used to prove, without charging:

1. the Paystack provider is registered and enabled on the configured GHS region;
2. the configured cart receives an actual Ghana shipping option;
3. Paystack test-mode initialization returns a usable hosted access code or authorization URL for card and supported Mobile Money channels;
4. a signed test callback/webhook advances the Medusa payment session;
5. the cart completes to one Medusa order and confirmation can retrieve it; and
6. no legacy order/payment record is created.

Until that gate passes, keep `NEXT_PUBLIC_MEDUSA_CART_ENABLED=false`. No code-level review finding remains open from commerce-004 review 01.
