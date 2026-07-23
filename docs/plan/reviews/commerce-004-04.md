# commerce-004 independent verification review 04

## Conclusion

**The Redis/cart/Paystack initialization boundary passes, but commerce-004 remains blocked.** The live evidence proves a non-charging Paystack session can be initialized after a real cart mutation and shipping selection. It does not prove authorization, signed webhook handling, order completion, or legacy-write isolation. `NEXT_PUBLIC_MEDUSA_CART_ENABLED` remains unset in `.env.local` and explicitly `false` in `.env.example`, so the storefront correctly resolves to the legacy path.

## Verified findings

- Redis is opt-in. With `MEDUSA_REDIS_ENABLED` absent or false, Redis modules and `projectConfig.redisUrl` are omitted even when a stale `REDIS_URL` exists; Medusa uses its built-in local providers.
- Explicit Redis activation trims the URL and fails fast when `MEDUSA_REDIS_ENABLED=true` has no `REDIS_URL`. The focused tests cover disabled/default, enabled, and missing-URL cases.
- The live review evidence records a healthy backend with Redis disabled, `pp_paystack_paystack` enabled for the configured GHS region, a disposable cart with one persisted line item, a persisted Ghana address, two applicable shipping options, and one attached shipping method.
- Paystack initiation produced one pending Medusa payment session with an access code and authorization URL. Those values are redacted.
- The gate stopped before authorization. It did not invoke a callback/webhook, `cart.complete`, charge, capture, refund, OTP, SMS, or a legacy order/payment write.

## Production start/Admin finding

The developer changed the backend start script to `cd .medusa/server && npm run start`, which places Medusa in the directory containing the built `public/admin` tree and addresses the original Admin static-asset working-directory mismatch. However, this is **not yet a verified production fix**:

1. `medusa-config` calls `loadEnv(..., process.cwd())`. After the new `cd`, the working directory is `.medusa/server`, while the checked-in local backend environment is `apps/backend/.env`. Therefore `npm run backend:start` no longer loads that file unless the deployment injects every required variable externally.
2. A clean backend build compiled the backend successfully, but its Admin/frontend phase did not finish within this review and was stopped. Since Medusa removes `.medusa/server` at the start of a build, the interrupted review build did not leave a complete `public/admin/index.html` artifact. Production startup and `/app` asset delivery could not be smoke-tested from that incomplete artifact.

The start command should preserve loading from `apps/backend/.env` (or explicitly require an externally injected environment), then a clean build plus HTTP probes for `/health`, `/app`, and at least one hashed Admin asset must pass.

## Verification evidence

- Storefront Medusa unit tests: **37/37 pass**.
- Backend unit suites: **2/2 pass, 12/12 tests pass** (Paystack provider and Redis configuration).
- Root TypeScript: **pass**.
- Backend production build: backend compilation passed; Admin/frontend completion was not established in this review.
- `git diff --check`: **pass** before this review file was added.

## Remaining blockers

1. Prove signed Paystack test callback/webhook state advancement exactly once.
2. Prove an authorized/captured test session completes exactly one Medusa order and confirmation retrieves it.
3. Prove the completed flow creates no legacy order/payment record.
4. Correct and smoke-test the production start/Admin environment and static-asset behavior described above.

Keep `NEXT_PUBLIC_MEDUSA_CART_ENABLED=false` (or unset) and keep `commerce-004` blocked until all four gates pass.
