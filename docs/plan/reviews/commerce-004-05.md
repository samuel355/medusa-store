# commerce-004 independent verification review 05

## Conclusion

**All four blockers from review 04 are now resolved. `commerce-004` is done.** Two real
bugs were the actual root cause of every prior activation failure and OTP/timeout-shaped
symptom seen in reviews 01–04; once fixed, the full checkout-to-order path was proven live,
end to end, through the real browser UI against a live Medusa backend.

## Root causes found and fixed

1. **The Medusa cart flag never took effect in the browser.** `isMedusaCartEnabled()`
   (`src/lib/medusa/cart/config.ts`) read `NEXT_PUBLIC_MEDUSA_CART_ENABLED` off an indirect
   `environment` parameter defaulting to `process.env`, not a literal
   `process.env.NEXT_PUBLIC_...` expression. Next.js only inlines `NEXT_PUBLIC_*` variables
   into client bundles when it sees that literal pattern in the source; nothing else in the
   codebase used the literal form for this specific variable. The flag therefore always
   resolved to `false` client-side regardless of its real value, silently routing every cart
   mutation through the legacy Postgres cart path with Medusa-format variant IDs — which
   fails immediately (`invalid input syntax for type uuid`) since those IDs aren't UUIDs.
   Server-side reads of the same flag (e.g. `checkout/page.tsx`) were unaffected, which is
   why the mismatch wasn't obvious from server logs alone.
2. **A cart-initialization race.** `CartController.mutate` called the data source's `add`
   before guaranteeing the initial create/retrieve call had resolved, so a fast click right
   after page load could throw "Medusa cart is not initialized."

Both are fixed in `src/lib/medusa/cart/config.ts` and `src/lib/medusa/cart/controller.ts`.

## Verification evidence

- **Environment**: live Postgres (Supabase), live Redis (Upstash), Paystack `sk_test_` key —
  all confirmed reachable before testing.
- **Backend**: `medusa develop` started clean, Redis-backed event bus/cache/locking modules
  connected, GHS region already had `pp_paystack_paystack` enabled from a prior setup run.
- **Full browser flow** (Playwright driving real Chromium, not a mocked client): add to
  cart → cart page shows the real Medusa cart → guest checkout → Ghana address → shipping
  method attached → card payment → Paystack Inline popup opened (test-mode simulator, no
  real charge) → "Success" selected.
- **Webhook**: Paystack's test transaction was independently verified via
  `/transaction/verify/:reference` (status `success`, correct amount/currency/metadata,
  `medusa_session_id` set automatically by our own provider code — not manually injected).
  Since Paystack cannot deliver a webhook to a local backend, that verified data was posted
  to `/hooks/payment/paystack_paystack` with a correctly computed HMAC-SHA512 signature
  using the real secret key. The payment session reached `authorized`.
- **Order completion**: `POST /store/carts/:id/complete` returned exactly one order with
  `paid_total` matching the cart total. `/api/orders/:id` (the storefront's own lookup)
  retrieved it correctly with the right totals, address, and line items.
- **No duplicate legacy order**: `medusastore.orders` row count was identical immediately
  before and after completion.
- **Production backend build/start**: `medusa build` completed (backend + admin frontend),
  `npm run start` (the real production script, including its `cd` into `.medusa/server`)
  came up healthy — `/health`, `/app`, and a hashed admin JS asset all returned 200, with
  env correctly loaded from `apps/backend/.env`.
- Root unit tests (37/37) and backend unit tests (14/14) pass after the fixes; root
  typecheck and production build both pass.

## Known non-blocking gaps carried forward

- Mobile Money OTP-required transactions are still explicitly unsupported in the Medusa
  checkout path (`src/lib/medusa/checkout/service.ts`); the legacy path supports them. Scope
  as a follow-up, not a reopening of this task.
- Backend request latency to the remote Postgres/Redis was highly variable during testing
  (single cart-create calls ranged from ~1s to ~16s). Functionally correct, but worth
  keeping an eye on for a production deployment's connection topology.

`NEXT_PUBLIC_MEDUSA_CART_ENABLED=true` is the storefront's live configuration.
