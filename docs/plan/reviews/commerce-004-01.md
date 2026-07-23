# commerce-004 verification review 01

## Conclusion

**Blocked.** The implementation is correctly isolated behind `NEXT_PUBLIC_MEDUSA_CART_ENABLED=false`, and the Medusa checkout branch does not create a legacy order. However, the activation gate is not proven and several required checkout/payment contracts are incomplete. Do not enable the migration flag yet.

## Blocking findings

1. **Payment authorization is not reliably established before cart completion.** `CheckoutFlow.completeMedusaPayment` calls `sdk.store.cart.complete` directly from Paystack Inline's `onSuccess` callback. It does not retrieve/poll the Medusa payment session until the provider reports `authorized` or `captured`; the signed webhook can race the browser callback. The authorization-URL branch redirects away and has no return/callback recovery path that completes the cart. The no-URL additional-action state also has no polling or completion action. This does not satisfy the required authorization/capture gate or complete all card/Mobile Money flows.

2. **The Medusa Mobile Money path discards required user input.** Although the UI requires network and Mobile Money number, the Medusa initiation sends only `channels: ["mobile_money"]`; `momoProvider` and `momoPhone` are never passed into the payment session. The Medusa branch has no OTP submission path. The legacy OTP code remains, but is bypassed when `medusa=true`, so the required OTP/approval preservation is not demonstrated.

3. **Successful completion does not refresh the shared cart state.** The code removes `sobalshop_medusa_cart_id` directly, but `CartProvider` exposes no clear/refresh operation and retains the completed cart in memory. This fails the explicit cart cleanup-and-refresh requirement.

4. **Confirmation/tracking cannot read the Medusa order identifier produced by checkout.** Checkout redirects with `order.id`, but `ConfirmationCards`, tracking, and `/api/orders/[orderNumber]` only query legacy `medusastore.orders` by legacy order number. The resulting Medusa order is therefore shown as missing. Compatibility reads may remain, but a Medusa-order read path is required for the stable identifier handed off by checkout.

5. **Required test coverage and integration gate are incomplete.** Provider tests do not cover successful capture, update, provider/API typed failures across operations, failed webhook mapping, repeated webhook/idempotency behavior, or all required operation outcomes. Storefront tests exercise service calls only; they do not cover browser additional-action/redirect return, payment-state gating, cart cleanup/shared refresh, or confirmation handoff. No non-charging backend + Paystack test-mode initialization was run because the configured key could not be confirmed as a disposable test key and setup mutates region configuration.

## Non-blocking findings

- Webhook signature verification uses the raw body, HMAC-SHA512, equal-length checking, and `timingSafeEqual`. `charge.success` maps to Medusa's `captured` action with the Medusa session ID in metadata. No custom webhook route or parallel Next.js record is introduced by the new provider.
- Explicit provider-side idempotency state is absent. Medusa may make repeated identical `captured` actions idempotent in its webhook workflow, but this dependency is neither documented nor tested here.
- The provider secret is backend-only in runtime configuration; the Medusa storefront path does not read `PAYSTACK_SECRET_KEY`. `.env.example` still documents the legacy root secret/public key because the legacy checkout remains active.
- `apps/backend/.env.template` contains two `PAYSTACK_SECRET_KEY` entries, including a placeholder test-shaped value. Consolidating this would reduce configuration ambiguity.
- The setup script is repeatable in construction: it selects the GHS region, preserves existing providers, de-duplicates the Paystack provider ID, and fails when no GHS region exists. It was not executed during review because it changes external database state.
- Provider configuration validates the secret and fails fast when absent. This also means backend startup/build environments must supply a backend secret while the provider is registered, even while the storefront migration flag is false.

## Verification evidence

- `npm run test:unit`: pass, 30/30 root tests.
- `npm run typecheck`: pass.
- `npx tsc --noEmit` in `apps/backend`: pass.
- `npm run test:unit` in `apps/backend`: blocked before discovery because `apps/backend/integration-tests/setup.js` referenced by Jest does not exist.
- Backend health: `GET http://localhost:9000/health` returned 200 during this review; the previously reported backend-down condition is stale.
- Backend build: backend source compilation completed successfully; the admin/frontend phase did not finish within the review window and was stopped after an extended wait.
- Storefront production build compiled successfully and reached TypeScript checking in the captured run, but no final successful exit was obtained in the review window.
- `git diff --check`: pass.
- No Paystack initialization, charge, OTP, capture, refund, SMS, setup script, or other external mutation was executed.

## Activation decision

`NEXT_PUBLIC_MEDUSA_CART_ENABLED` remains `false`, as required. Activation is blocked until the findings above are resolved, backend Jest can discover the provider tests, the full builds finish, the GHS provider/shipping setup is verified, and a non-charging Paystack test-mode cart-to-order integration passes.
