# commerce-004 live verification review 03

## Conclusion

**The safe non-charging initialization gate passes; activation remains blocked at authorization/webhook/order completion.** `NEXT_PUBLIC_MEDUSA_CART_ENABLED` must remain `false`.

## Live-gate findings

- The backend was started with `MEDUSA_REDIS_ENABLED=false`; health passed and workflow mutations no longer stalled on the unavailable Redis lock provider.
- Store API returned `pp_paystack_paystack` for the configured GHS region.
- A disposable cart was created. One existing published variant was added and persisted as one line item.
- A Ghana shipping address persisted on the cart. Store API returned two applicable shipping options, and attaching one option persisted one shipping method.
- A Medusa payment collection was created. Paystack initialization returned one pending session with both an access code and authorization URL. Values are intentionally redacted.
- No authorization, cart completion, charge, capture, refund, OTP, SMS, callback/webhook, or legacy order/payment write was performed.

## Automated evidence

- Root Medusa unit tests: **37/37 pass**.
- Backend provider unit command completed successfully with Watchman disabled.
- `git diff --check`: **pass** before this review file was added.
- Production-start diagnosis found that invoking `medusa start` from the source directory resolves Admin assets relative to the wrong root even when `.medusa/server/public/admin/index.html` exists. The backend start script now enters `.medusa/server` when a completed build is present, while retaining direct `medusa start` behavior inside a packaged server.
- The start script preserves the original backend directory in `MEDUSA_ENV_DIR`; compiled `medusa-config` loads environment files from that explicit directory. Standalone packaged deployments without the variable continue to load from their current directory.

## Exact remaining activation gate

Using a disposable cart and a Paystack test secret:

1. With explicit test-mode authorization, verify a signed Paystack callback/webhook advances the Medusa payment session exactly once.
2. Verify an authorized/captured test session completes to one Medusa order and that confirmation retrieves it.
3. Confirm no legacy order/payment row is created across the completed flow.

Until these checks are completed, keep `NEXT_PUBLIC_MEDUSA_CART_ENABLED=false` and keep `commerce-004` blocked.
