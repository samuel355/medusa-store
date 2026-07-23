# Commerce Architecture

## Purpose and boundary

Medusa owns commerce truth. Next.js owns presentation, route composition, browser interaction, and storefront-specific content. PostgreSQL is accessed directly only by Medusa or by explicitly documented custom-content modules.

```text
Browser
  │
  ▼
Next.js storefront
  ├─ Server Components ──► Medusa Store API ──► Commerce modules ──► PostgreSQL
  ├─ Cart Context ───────► Medusa Store API
  └─ Custom content ─────► documented custom data boundary

Medusa Admin ────────────► Medusa Admin API ──► Commerce modules
Paystack webhooks ───────► Medusa payment provider/workflow
Arkesel notifications ◄── Medusa subscribers
```

## Ownership

| Concern | Owner | Storefront access |
|---|---|---|
| Products, variants, categories, collections | Medusa Product module | Store API / JS SDK |
| Prices, regions, promotions | Medusa pricing and promotion modules | Store API / JS SDK |
| Inventory and reservations | Medusa Inventory module | Store API / workflows |
| Cart and line items | Medusa Cart module | Store API / Cart Context |
| Orders, returns, fulfillment | Medusa commerce modules | Store API / Admin API |
| Payment state | Medusa payment module with Paystack provider | Checkout workflow |
| Customer commerce identity | Medusa Customer/Auth modules | Store API session/token |
| Transactional SMS | Medusa subscribers invoking Arkesel | Event-driven |
| Editorial hero content | Custom content boundary | Server-side read adapter |

## Public entry points

- Storefront SDK: `src/lib/medusa/sdk.ts`
- Storefront environment contract: `src/lib/medusa/config.ts`
- Storefront connectivity check: `src/lib/medusa/health.ts`
- Medusa backend: `apps/backend`
- Medusa Store API base: `${NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store`

## Contract rules

- Missing backend URL, publishable key, or region ID is a configuration error; it must not silently fall back.
- The backend URL must be an absolute HTTP(S) URL. The SDK uses the configured
  publishable key and the connectivity check retrieves the configured region.
- Store API failures return typed integration errors with the operation and cause.
- Server reads may use Next.js caching. Customer, cart, checkout, and payment state must not use shared public caches.
- The browser persists only the Medusa cart ID. Cart contents and totals are always rehydrated from Medusa.
- One Cart Context owns client cart state for the header, product actions, cart page, and checkout.
- `commerce-004` is done: cart and checkout switched to Medusa atomically. `NEXT_PUBLIC_MEDUSA_CART_ENABLED=true` is the live configuration; the legacy data source in `src/lib/medusa/cart/CartProvider.tsx` remains only as a fallback until `commerce-007` removes it.
- Direct storefront writes to commerce SQL tables are forbidden after the owning migration task completes.
- Paystack secrets and webhook verification exist only in the Medusa backend. Next.js may render provider-required actions but cannot own payment truth.
- A Medusa order is created only by cart completion after payment authorization; Paystack callbacks cannot create parallel storefront orders.
- Migration adapters must preserve current page-facing types until the consuming UI is migrated.
- Storefront pages must remain operational between tasks; destructive table removal happens only in `commerce-007`.

## Migration flow

```text
SDK foundation
   ↓
Catalogue reads
   ↓
Cart state
   ↓
Checkout + Paystack
   ↓
Customer identity
   ↓
Orders + notifications
   ↓
Legacy removal
```
