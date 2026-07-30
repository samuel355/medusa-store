# Begnon

Modern ecommerce storefront with a premium PWA UI. Commerce truth (products, cart,
checkout, payment, orders) is owned by **MedusaJS** (`apps/backend`); Supabase is used for
auth and a couple of custom-content/legacy tables. See `docs/HOW_IT_WORKS.md` for the full
picture. Backed by:

- MedusaJS (`apps/backend`): products, variants, cart, checkout, payment sessions, and orders — the storefront talks to it via `src/lib/medusa/`
- Paystack: card and Mobile Money checkout, implemented as a Medusa payment provider (`apps/backend/src/modules/paystack-payment`)
- Supabase Auth: phone OTP, email/password, Google OAuth, with cookie-based sessions (`src/lib/integrations/supabase.ts`, `middleware.ts`)
- Supabase Postgres (schema `medusastore`): customer identity, wishlists, settings, and hero-banner content not yet migrated to Medusa — accessed directly via a pooled Postgres connection (see `src/lib/db/`)
- Redis + BullMQ: fulfillment and SMS notification queues (`src/lib/integrations/queues.ts`, `src/workers/`)
- Arkesel: SMS notifications
- Cloudflare R2: product image storage

## Run locally

You need both the storefront and the Medusa backend running (see `docs/HOW_IT_WORKS.md`
for the full command sequence):

```bash
npm install
npm --prefix apps/backend install
npm run backend:dev   # terminal 1 — Medusa backend, port 9000
npm run dev            # terminal 2 — Next.js storefront, port 3000
```

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: from your Supabase project's API settings (Supabase's newer key-naming scheme — this is the same thing older docs call the "anon key")
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_REGION_ID`: from the Medusa backend / its Admin dashboard — all three are required
- `NEXT_PUBLIC_MEDUSA_ADMIN_URL`: Medusa's own Admin dashboard URL; `/admin` redirects recognized store admins there
- `DATABASE_URL`: a direct/pooled Postgres connection string to that same Supabase project, with `search_path` set to `medusastore` (either via `?options=-c%20search_path%3Dmedusastore` in the URL or the `connection` option in `src/lib/db/client.ts`) — used by both the storefront's legacy reads and (separately) the Medusa backend's own `apps/backend/.env`
- `PAYSTACK_SECRET_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`: from your Paystack dashboard, also set in `apps/backend/.env` (the Medusa payment provider owns the real Paystack integration; webhook signatures are verified with the same secret key — there is no separate webhook signing secret)
- `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`: from Arkesel
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`: from your Cloudflare R2 bucket
- `REDIS_URL`: local or hosted Redis (BullMQ)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: only needed if configuring Google OAuth in Supabase Auth directly; the app itself just calls `supabase.auth.signInWithOAuth`

`apps/backend` has its own `.env` (see `apps/backend/.env.template`) — it is a separate app
with its own dependencies and environment, not covered by the root `.env.local`.

### Database setup

Run `database/supabase/medusastore_schema.sql` in the Supabase SQL editor (it's idempotent — safe to re-run). It creates the `medusastore` schema, all commerce tables, RLS policies, and seeds starter categories/products.

### Admin access

There's no signup flow for admins. After a user signs up normally, insert a row into `medusastore.admin_users` (`auth_user_id`, `role`). Visiting `/admin` then redirects them to Medusa's own Admin dashboard, where all product, inventory, and order management happens.

### Background workers

Paid orders are handed off to BullMQ, not processed inline in the webhook. Run the workers as a separate long-lived process (not started by `npm run dev`):

```bash
npm run workers       # production: tsx src/workers/index.ts
npm run workers:dev   # local dev: restarts on file change
```

This process must be running for order fulfillment status updates and Arkesel SMS notifications to actually happen — a paid order without a running worker just sits queued in Redis. Deploy it as its own process (e.g. a separate dyno/service), not bundled into the Next.js server process.

## Known gaps

- No customer-facing address book yet (`/customers/addresses` shows the latest order's address only).
- Customer identity/order history still reads the legacy Supabase tables rather than Medusa — that migration hasn't started yet.
