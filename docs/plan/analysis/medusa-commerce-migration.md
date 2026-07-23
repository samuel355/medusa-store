# Medusa Commerce Migration Analysis

## Current state

The repository contains a Medusa backend/admin in `apps/backend`, but the root Next.js storefront reads and writes a parallel `medusastore` schema through custom database modules. Supabase Auth, custom cart routes, custom checkout routes, and direct order SQL duplicate Medusa commerce responsibilities.

## Module decomposition

| Module | Input | Output | Dependency |
|---|---|---|---|
| SDK foundation | backend URL, publishable key, region ID | typed Store API client | Medusa backend |
| Catalogue adapter | Medusa product/category responses | existing `StoreProduct`/`StoreCategory` contracts | SDK foundation |
| Cart provider | Medusa cart ID and mutations | shared cart state | catalogue variants, SDK |
| Checkout/payment | address, shipping, Paystack authorization | Medusa order | cart provider, payment provider |
| Customer identity | credentials/session | Medusa customer session | SDK/auth module |
| Orders/notifications | Medusa commerce events | account history and SMS | checkout, subscribers |
| Legacy cleanup | completed migration paths | removed duplicate SQL/routes | all predecessors |

## Integration enumeration

1. Next.js creates the SDK with the storefront publishable key.
2. Server catalogue adapters call Medusa Store API and map responses to page contracts.
3. Cart Context creates and retrieves Medusa carts and calls line-item APIs.
4. Checkout configures shipping and payment sessions on the Medusa cart.
5. The Paystack provider authorizes/captures payments and Medusa completes the cart.
6. Medusa creates inventory reservations and orders through core workflows.
7. Subscribers call Arkesel after order/payment/fulfillment events.
8. Customer account pages call Medusa Store API for identity and order history.

## Delivery constraints

- Preserve the current storefront appearance and URLs.
- Keep the existing custom path available until its Medusa replacement is verified.
- No task removes data required by a later migration or rollback.
- Public read caching and personalized state caching remain separate.

