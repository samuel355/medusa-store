# commerce-003 verification review 02

## Conclusion

**Pass.** The release-blocking cart/checkout mismatch from review 01 is resolved by the revised migration contract and implementation: cart consumers default to the operational legacy source, and Medusa activation requires the explicit `NEXT_PUBLIC_MEDUSA_CART_ENABLED=true` flag that is reserved for the atomic `commerce-004` checkout release. The Medusa provider/service remain complete behind that boundary, requested provider invariants are covered, typed failures preserve cart state, and UI event handlers consume rejected mutations without unhandled promises.

## Findings

No P1, P2, or P3 findings remain.

## Review 01 resolution

### Resolved — cart and checkout use the same operational source by default

`isMedusaCartEnabled` returns false when the flag is missing or false. `CartProvider` therefore selects `createLegacyCartDataSource()` by default, keeping the header, product actions, cart page, `/checkout`, pending-order creation, and reorder behavior aligned on the existing SQL cart/cookie path.

`.env.example` documents `NEXT_PUBLIC_MEDUSA_CART_ENABLED=false` and states that it must remain false until `commerce-004`. The architecture and task contracts now require the cart and checkout switch to occur atomically. Setting the flag true early would be an invalid deployment configuration, rather than the default behavior delivered by this task.

### Resolved — provider invariants and typed failures are tested

The cart implementation now separates data source, controller, and React binding. `provider.test.ts` verifies:

- concurrent consumers share exactly one initialization promise;
- Medusa storage writes use only `sobalshop_medusa_cart_id` and the returned ID value;
- a mutation performs one source operation, accepts one returned state, and performs no redundant retrieve;
- typed initialization and mutation failures remain observable while mutation failure preserves the accepted cart;
- legacy compatibility is the default and Medusa mode requires explicit true.

Service tests cover create/retrieve/add/update/remove through the injected SDK boundary, contract errors at every response boundary, and operation/cause retention for every Store API failure.

### Resolved — UI mutation rejections are handled

`CartPageClient`, `ProductCatalog`, and `ProductPurchasePanel` now catch rejected cart actions. The provider remains responsible for exposing the error in explicit visible alert state, while event-handler promises no longer escape as unhandled rejections.

## Contract and scope checks

- One `CartProvider` wraps the header and page content through `AppShell` without adding a DOM/layout wrapper.
- Header, catalogue, product-purchase, and cart-page consumers all use the same context.
- The controller deduplicates initialization and accepts each returned mutation cart without a follow-up fetch.
- Medusa mode persists only the cart ID; contents and totals are rehydrated from the Store API.
- The typed adapter preserves the existing `CartItem`, totals, and `CartResponse` UI contracts and rejects malformed required fields.
- Medusa create/read/add/update/remove failures retain typed contract or operation errors; no Medusa integration failure becomes an empty cart.
- Loading, empty, initial failure, and mutation failure states remain explicit in the cart UI.
- Existing header/cart structure and styling contracts are preserved; changes are limited to state/error behavior and disabled mutation controls.
- Legacy SQL cart tables, route, checkout, order, and reorder paths remain intact for compatibility. Their removal remains assigned to `commerce-007`.
- No checkout workflow, Paystack provider, authentication migration, Medusa order workflow, or notification work was introduced.

## Verification evidence

| Check | Result |
|---|---|
| `npm run test:unit` | Pass: 27/27 tests |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; 40 static pages generated and route manifest completed |
| `git diff --check` | Pass before writing this review |
| Production server startup | Pass: Next reported ready on port 3001 |
| HTTP route probes | Unavailable from the separate command process; it could not connect to the started session |

The complete build plus direct controller/service coverage is sufficient for acceptance; browser-visible consistency should still be included in the normal deployment smoke test when the shared runtime is available.
