# SobalShop

Modern ecommerce storefront with a premium PWA UI, backed by:

- Supabase Postgres (schema `medusastore`): products, variants, carts, orders, payments, wishlists, customers, and admin data — accessed directly via a pooled Postgres connection (see `src/lib/db/`)
- Supabase Auth: phone OTP, email/password, Google OAuth, with cookie-based sessions (`src/lib/integrations/supabase.ts`, `middleware.ts`)
- Paystack: card and mobile money checkout, with server-computed totals and an idempotent signed webhook
- Redis + BullMQ: fulfillment and SMS notification queues (`src/lib/integrations/queues.ts`, `src/workers/`)
- Arkesel: SMS notifications
- Cloudflare R2: product image storage

`apps/backend` contains an unused MedusaJS starter kept from an earlier prototype. It is not part of the active storefront path.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: from your Supabase project's API settings
- `DATABASE_URL`: a direct/pooled Postgres connection string to that same project, with `search_path` set to `medusastore` (either via `?options=-c%20search_path%3Dmedusastore` in the URL or the `connection` option in `src/lib/db/client.ts`)
- `PAYSTACK_SECRET_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`: from your Paystack dashboard. Paystack webhook signatures are verified with the same secret key — there is no separate webhook signing secret.
- `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`: from Arkesel
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`: from your Cloudflare R2 bucket
- `REDIS_URL`: local or hosted Redis (BullMQ)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: only needed if configuring Google OAuth in Supabase Auth directly; the app itself just calls `supabase.auth.signInWithOAuth`

### Database setup

Run `database/supabase/medusastore_schema.sql` in the Supabase SQL editor (it's idempotent — safe to re-run). It creates the `medusastore` schema, all commerce tables, RLS policies, and seeds starter categories/products.

### Admin access

There's no signup flow for admins. After a user signs up normally, insert a row into `medusastore.admin_users` (`auth_user_id`, `role`) to grant them access to `/admin`.

### Background workers

Paid orders are handed off to BullMQ, not processed inline in the webhook. Run the workers as a separate long-lived process (not started by `npm run dev`):

```bash
npm run workers       # production: tsx src/workers/index.ts
npm run workers:dev   # local dev: restarts on file change
```

This process must be running for order fulfillment status updates and Arkesel SMS notifications to actually happen — a paid order without a running worker just sits queued in Redis. Deploy it as its own process (e.g. a separate dyno/service), not bundled into the Next.js server process.

## Known gaps

- No customer-facing address book yet (`/customers/addresses` shows the latest order's address only).
- `/admin` covers order status/fulfillment updates and a read-only product list — no product/inventory editing UI yet.
