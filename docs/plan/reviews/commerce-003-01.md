# commerce-003 verification review 01

## Conclusion

**Blocked.** The Medusa cart adapter/service and shared React provider satisfy most of the isolated cart-state contract: browser persistence is limited to the cart ID, Store API failures are not converted to empty carts, header/product/cart consumers share one provider, and add/update/remove use the injected SDK boundary. However, the migration breaks the existing cart-to-checkout path. Items added to the Medusa cart cannot reach checkout because checkout still reads the legacy SQL cart cookie. This violates the architecture requirement that storefront pages remain operational between migration tasks and blocks acceptance of `commerce-003`.

## Findings

### P1 / blocking — Medusa cart items cannot proceed to checkout

The migrated cart persists `sobalshop_medusa_cart_id` in browser local storage and all current add/update/remove UI actions mutate that Medusa cart (`src/lib/medusa/cart/CartProvider.tsx`). The cart page still renders an enabled `/checkout` link. But `src/app/checkout/page.tsx` reads only the legacy `sobalshop_cart_id` HTTP cookie, then loads `getActiveCart` / `getCartWithItems` from the custom SQL cart. `src/lib/checkout/createPendingOrder.ts` has the same legacy dependency.

Consequently, a shopper can add visible items, review them on `/cart`, and click “Proceed to checkout,” only to be redirected back to `/cart` because the legacy cart is absent or empty. If a stale legacy cart cookie exists, checkout can instead show different items from those in the visible Medusa cart. The architecture explicitly requires storefront pages to remain operational between tasks, so deferring all checkout integration to `commerce-004` cannot leave the current CTA connected to a different cart source.

Resolve the transition without implementing payment/auth/order scope early: checkout must at least consume/validate the same Medusa cart identity and line-item state, or the task sequence/acceptance contract must provide a deliberate non-destructive bridge that keeps cart-to-checkout continuity until `commerce-004` replaces checkout.

### P2 / blocking — required shared-fetch and refresh semantics are not verified

`src/lib/medusa/cart/service.test.ts` proves that five service methods call an injected SDK boundary, but it does not verify the task's state-management invariants:

- one initial retrieve/create when header and cart page mount together;
- only the cart ID is persisted;
- each add/update/remove response is accepted into shared state exactly once;
- mutation errors remain typed and are exposed without replacing state;
- malformed create/retrieve/add/update/remove payloads retain `MedusaCartContractError`;
- operation failures retain `MedusaCartOperationError`, operation, and cause.

Those requirements live in `CartProvider`, while there is no provider/context test. The current service test also ignores query arguments and always returns the same cart, so it cannot prove refresh/state semantics. Add a provider-level test with an injected service (or equivalent testable controller boundary) and explicit error-path tests before accepting this task.

### P3 / non-blocking — mutation failures produce unhandled rejected UI promises

The provider correctly records and rethrows mutation errors. Event handlers in `CartPageClient`, `ProductCatalog`, and `ProductPurchasePanel` await those actions without a `catch`. The provider error is rendered, but the rejected event-handler promise is also unhandled and will generate browser/runtime noise. Catch at the UI boundary after relying on provider state for the visible error, or make the context action contract return a typed result instead of throwing.

## Contract and scope checks

- `CartProvider` wraps both `StoreHeader` and page content through `AppShell`; there is one provider instance per rendered storefront page.
- Header, catalogue add actions, product purchase actions, and cart-page actions use `useCart`; none call `/api/cart`.
- The provider performs a single initial create or retrieve effect. Header and cart content do not issue their own initial requests.
- Browser persistence in the new implementation stores only `sobalshop_medusa_cart_id`; cart contents and totals are rehydrated from Medusa.
- `mapMedusaCart` preserves the existing `CartItem`, `CartResponse`, and totals shapes and throws `MedusaCartContractError` for malformed required fields.
- Create/read/add/update failures are wrapped in `MedusaCartOperationError`; remove failures are also wrapped, while mapping contract errors remain distinct.
- Add, update, and remove use Medusa Store API methods and accept the returned cart directly, with no follow-up retrieve request.
- Loading, initial-load failure, empty-cart, and mutation-error UI states are explicit; integration failure is not silently presented as an empty cart.
- Header and cart page structure/class names are preserved apart from required loading/error state markup and disabled mutation controls; no redesign was introduced.
- The legacy `/api/cart` route and SQL cart utilities remain intact. New cart UI consumers do not import them, but checkout, pending-order creation, and reorder still actively use the legacy cart identity/data path.
- No Paystack/provider, customer-auth migration, order workflow, or Medusa checkout implementation was added under the cart task.

## Verification evidence

| Check | Result |
|---|---|
| `npm run test:unit` | Pass: 20/20 tests, including 4 cart tests |
| `npm run typecheck` | Pass |
| `git diff --check` | Pass before writing this review |
| `npm run build` | Not completed: another Next build held `.next/lock` |
| Live `/`, `/shop`, `/cart` | Not available: no storefront was listening on port 3000 |

The unavailable build/live checks reduce runtime evidence, but the cart-to-checkout source mismatch is directly established by the code paths and remains a release-blocking functional defect.
