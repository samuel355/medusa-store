# commerce-004 independent verification review 06

## Conclusion

**The Mobile Money OTP gap noted in review 05 was a misdiagnosis, not a missing feature.**
Investigated live and fixed by removing an incorrect guard; Mobile Money now shares the
exact same, already-proven code path as card.

## What was actually wrong

`checkout/service.ts` threw on `session.data?.status === "send_otp"`, on the assumption
that a Paystack Mobile Money transaction might need a manual OTP-submission step this
provider didn't implement. That assumption doesn't hold for this provider's actual
implementation:

- The Medusa Paystack provider's `initiatePayment` always calls Paystack's **Standard
  Checkout** endpoint, `/transaction/initialize` — for both `card` and `mobile_money`
  channels. Confirmed live: initializing a session with `channels: ["mobile_money"]`
  returns the same `access_code`/`authorization_url` shape as card, never a `status` field.
- `send_otp` is a status returned by Paystack's separate **Direct Charge API**
  (`/charge`, `/charge/submit_otp`) — the API the legacy, pre-Medusa checkout path uses
  (`src/lib/integrations/paystack.ts`). This provider doesn't call that API at all, so the
  guarded condition could never actually occur.
- Paystack's own Inline popup, when restricted to the `mobile_money` channel, presents its
  own network-selection and confirmation UI and handles any OTP/approval step **entirely
  inside itself** — identical in kind to how it collects a card number for the `card`
  channel. No extra action is required from the storefront or the provider.

## Verification evidence

- Removed the guard in `src/lib/medusa/checkout/service.ts`; updated
  `checkout/service.test.ts`'s corresponding test to assert Mobile Money returns a normal
  popup access code instead of asserting a rejection.
- Live browser test (Playwright driving real Chromium): add to cart → checkout → guest →
  Ghana address/shipping → Mobile Money (MTN, test number) → real Paystack popup → network
  selected → "Please wait while we authorize this test transaction" → "Payment Successful."
- That transaction was independently verified via Paystack's `/transaction/verify/:reference`
  (`status: success`, `channel: mobile_money`, correct amount, `medusa_session_id` set
  automatically by our own provider code).
- Delivered the corresponding signed `charge.success` webhook (same method as review 05,
  since Paystack cannot reach a local backend); payment session reached `authorized`.
- `cart.complete()` created exactly one Medusa order (`paid_total` matched the cart total);
  the storefront's own order lookup retrieved it correctly.
- `medusastore.orders` row count was identical before and after — no legacy duplicate.
- Root unit tests (37/37) and typecheck pass after the change.

## Remaining note

The "Mobile Money OTP unsupported" line is removed from the known-gaps list — card and
Mobile Money are now the same, already-verified code path. No further action needed for
this task.
