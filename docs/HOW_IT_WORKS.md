# How Begnon Works

Begnon is a Ghana-focused ecommerce storefront: a Next.js frontend backed by a MedusaJS
commerce engine, with Supabase used for authentication and a handful of legacy tables not
yet migrated, Paystack for payment, Redis/BullMQ for background jobs, Arkesel for SMS, and
Cloudflare R2 for product imagery.

This document explains the tech stack, who uses the app, and what actually happens on each
screen. For the architectural rules and migration task tracker, see
[`docs/architecture/commerce.md`](architecture/commerce.md) and
[`docs/plan/README.md`](plan/README.md).

## 1. Tech stack

| Layer | Technology | Where |
|---|---|---|
| Storefront UI | Next.js 16 (App Router), React 19, TypeScript | `src/app`, `src/components` |
| Storefront styling | Hand-authored CSS (no framework), design tokens in `:root` | `src/app/globals.css` |
| Commerce engine | MedusaJS v2 (products, cart, checkout, orders, payment sessions) | `apps/backend` |
| Storefront ↔ Medusa | `@medusajs/js-sdk`, typed adapters | `src/lib/medusa/**` |
| Auth & legacy data | Supabase (Postgres + Auth), schema `medusastore` | `src/lib/auth`, `src/lib/db`, `database/supabase/medusastore_schema.sql` |
| Payments | Paystack — Medusa payment provider (card, Mobile Money) | `apps/backend/src/modules/paystack-payment`, `src/lib/medusa/checkout` |
| Payments (legacy path) | Paystack REST calls direct from Next.js API routes | `src/lib/integrations/paystack.ts`, `src/app/api/paystack/**` |
| Background jobs | Redis + BullMQ (fulfillment, SMS notifications) | `src/workers`, `src/lib/integrations/queues.ts` |
| SMS | Arkesel | `src/lib/integrations/arkesel.ts` |
| Image storage | Cloudflare R2 (S3-compatible) | `src/lib/integrations/r2.ts` |
| PWA | Web manifest + service worker | `public/manifest.webmanifest`, `public/sw.js` |

Two commerce data paths currently coexist, gated by `NEXT_PUBLIC_MEDUSA_CART_ENABLED`:

- **Medusa path** (flag on): catalogue, cart, checkout, and orders all go through the Medusa
  Store API (`src/lib/medusa/**`). This is the live path today.
- **Legacy path** (flag off): cart/checkout/orders read and write the `medusastore` Postgres
  schema directly via `src/lib/db/**` and `src/app/api/**`. Kept as a fallback during
  migration; catalogue reads (`db/products.ts`, `db/categories.ts`) already delegate to
  Medusa internally regardless of the flag.

Hero banners (`db/hero.ts`) are a permanent exception — that content isn't modeled in
Medusa and is read directly from Supabase either way.

## 2. Who uses the app

| Role | How they authenticate | What they can do |
|---|---|---|
| **Guest shopper** | No account | Browse, search, add to cart, check out without an account, track an order by number |
| **Customer** | Supabase Auth — phone OTP, email/password, or Google OAuth | Everything a guest can, plus saved addresses*, order history, wishlist, notification preferences |
| **Admin** | Same Supabase Auth, plus a row in `medusastore.admin_users` | Everything a customer can, plus `/admin`: order list, order status/fulfillment updates, read-only product list |
| **Backend operator** | Medusa Admin (separate app at the Medusa backend's `/app`) | Full commerce management: products, inventory, regions, payment provider config — this is MedusaJS's own admin dashboard, not part of the Next.js app |

\* Address book CRUD isn't built yet — checkout takes a single free-text delivery address
today (see `docs/FULLSTACK_ROADMAP.md` open gaps).

There's no self-serve admin signup: an admin is created by manually inserting a row into
`medusastore.admin_users` for an existing Supabase user.

## 3. Guest / customer flow (the actual shopping journey)

```
Home (/) ──▶ Shop (/shop) ──▶ Product detail (/products/[slug]) ──▶ Cart (/cart) ──▶ Checkout (/checkout) ──▶ Confirmation (/confirmations)
```

**1. Browse (`/`, `/shop`, `/products/[slug]`)**
Product and category data is read from Medusa's Store API (`src/lib/medusa/catalogue`),
mapped into the storefront's own `StoreProduct`/`StoreCategory` shape so the UI didn't need
to change during migration. Server Components fetch this with Next.js caching
(`unstable_cache`, tags `medusa-products` / `medusa-categories`).

**2. Add to cart**
Clicking "Add to cart" or "Buy now" (`ProductPurchasePanel.tsx`, `ProductCatalog.tsx`) calls
`useCart().addToCart(variantId, quantity)`. One shared `CartProvider` (mounted once in
`AppShell`) owns cart state for the header badge, product pages, the cart page, and
checkout — every consumer reads/writes the same in-memory cart, no per-page refetching.

- Under the hood, the provider picks a Medusa-backed data source (creates/retrieves a real
  Medusa cart, persists only the cart ID in `localStorage`) when the feature flag is on.
- The first mutation on a fresh page load waits for the cart's initial
  create-or-retrieve call to finish before mutating, so a fast click right after page load
  can't race ahead of cart initialization.

**3. Cart (`/cart`)**
Shows live Medusa cart contents (`CartPageClient.tsx`): quantity steppers, remove, running
subtotal — every change is a real Medusa Store API call, not local-only state.

**4. Checkout (`/checkout`)**
- Gate: sign in or **continue as guest**.
- Step 1: email, phone, delivery address (Ghana-only today — city is hardcoded to Accra).
- Step 2: choose **Mobile Money** or **Card**.
  - `checkout.prepare()` attaches the shipping address and picks the first available Ghana
    shipping option on the Medusa cart.
  - `checkout.initiate()` opens a Medusa payment session against the **Paystack** provider.
  - **Card**: Paystack's Inline popup opens in an overlay on the same page (no redirect) —
    the storefront never sees the card number.
  - **Mobile Money**: network + phone number, then an on-page OTP/approval prompt.
- After Paystack reports success, the client polls the payment session, then calls
  `cart.complete()` — **only then** does Medusa create the order. A cart is never marked
  paid or converted based on the popup's client-side callback alone; the payment session's
  server-side status is what gates completion.
- On success: cart is cleared, and the browser is redirected to
  `/confirmations?order=<medusa_order_id>`.

**5. Confirmation & tracking (`/confirmations`, `/tracking`, `/orders`)**
Order lookups accept either a legacy order number or a Medusa order ID
(`src/app/api/orders/[orderNumber]/route.ts` tries legacy first, then Medusa) — so
customers get one consistent confirmation/tracking experience regardless of which path
created the order.

**6. Account area (`/customers/*`, signed-in only)**
Order history, wishlist, notification preferences. Still backed by Supabase/legacy tables
today (customer identity migration to Medusa hasn't started — see `commerce-005` in the
migration tracker).

## 4. Payment flow in detail

```
Storefront                    Medusa backend                      Paystack
    │  initiate payment session   │                                    │
    ├─────────────────────────────▶  create payment session ──────────▶│ /transaction/initialize
    │                              │                                    │
    │  Inline popup (card) /       │                                    │
    │  OTP prompt (Mobile Money) ◀─┼────────────────────────────────────┤ customer pays
    │                              │                                    │
    │                              │◀─── charge.success webhook ───────┤ (signed, HMAC-SHA512)
    │                              │  verify signature, mark session    │
    │                              │  authorized/captured               │
    │  poll session status ───────▶│                                    │
    │  complete cart ─────────────▶│  create exactly one order          │
```

Key guarantees enforced by the code (not just convention):

- **Paystack secrets never reach the browser.** They live only in the Medusa backend
  (`apps/backend/.env`); the storefront only ever sees a publishable key and session
  access codes.
- **Webhook signatures are verified with a constant-time comparison** against the raw
  request body (`apps/backend/src/modules/paystack-payment/service.ts`), not a fast-fail
  string compare.
- **An order is only created by `cart.complete()`, after the payment session is
  independently confirmed `authorized`/`captured`.** Paystack's client-side "success"
  callback is a UI signal to start polling, never the trigger for order creation.
- **No duplicate orders.** Only the Medusa path writes an order for a Medusa-cart checkout;
  the legacy Supabase order tables are untouched by it.

## 5. Background jobs (Ghana delivery + SMS)

Paid orders don't do fulfillment/SMS inline in the request — they're hand off to Redis/BullMQ
queues, processed by a **separate worker process** (`npm run workers`), not the Next.js
server itself:

- **Fulfillment queue** — marks an order's fulfillment status as queued for dispatch.
- **Notification queue** — sends an Arkesel SMS ("your order has been paid...").

If the worker process isn't running, paid orders simply sit queued — nothing breaks, but
the customer won't get an SMS or fulfillment update until a worker picks it up.

## 6. Admin flow

`/admin` (Next.js, gated by `medusastore.admin_users`) is intentionally lightweight:

- Dashboard: revenue/order/product summary tiles.
- Order list with status + fulfillment updates.
- Read-only product list (no create/edit yet — that lives in Medusa's own Admin app).

Full catalogue and inventory management happens in **MedusaJS's own Admin dashboard**
(a separate app served by the Medusa backend, e.g. `http://localhost:9000/app`), not inside
this Next.js `/admin` page.

## 7. Where things live (quick map)

```
src/app/                     Pages + API routes (App Router)
src/components/store/        Shared shell: header, footer, brand mark, cart provider mount
src/components/storefront/   Page-level UI: catalog, product panel, cart, checkout, auth
src/lib/medusa/              Storefront ↔ Medusa: sdk, config, catalogue, cart, checkout, orders
src/lib/db/                  Legacy Supabase reads/writes (being phased out per migration plan)
src/lib/integrations/        Paystack (legacy), Arkesel, Supabase clients, R2, Redis queues
src/workers/                 BullMQ worker process (fulfillment, SMS) — run separately
apps/backend/                MedusaJS server: Paystack payment provider, seed/setup scripts
database/supabase/           Legacy Postgres schema (RLS policies, seed data)
docs/architecture/           Ownership/contract rules for the Medusa migration
docs/plan/                   Migration task tracker + dated verification reviews
```
