# Begnon Medusa Backend

Official MedusaJS v2 backend for Begnon commerce operations.

## Local Setup

```bash
cp .env.template .env
npm install
npm run dev
```

Medusa runs on `http://localhost:9000`; the admin dashboard is available at `http://localhost:9000/app`.

## Required Environment

- `DATABASE_URL`: Supabase Postgres connection string
- `MEDUSA_REDIS_ENABLED`: set to `true` only in an environment with reachable Redis; defaults to Medusa's built-in local event/cache/locking providers.
- `REDIS_URL`: required when `MEDUSA_REDIS_ENABLED=true`. If Redis is unavailable, disable the flag before starting the backend so cart workflows do not wait on remote locks.

`npm run start` records the original backend directory in `MEDUSA_ENV_DIR`, detects a completed `.medusa/server` build, and starts Medusa from that directory so compiled Admin assets resolve correctly without losing `apps/backend/.env`. In a standalone packaged server, the current directory remains both the runtime and environment directory. Deployment platforms may set `MEDUSA_ENV_DIR` explicitly when configuration files live elsewhere.
- `STORE_CORS`: storefront origins, including `http://localhost:3000`
- `JWT_SECRET` and `COOKIE_SECRET`: strong production secrets
- `PAYSTACK_SECRET_KEY`: checkout provider integration
- `ARKESEL_API_KEY`: SMS notifications
- `R2_*`: product images and receipt storage

## Seed

```bash
npm run seed
```

The seed creates:

- Begnon store
- Ghana region using `GHS`
- Same-day Accra and nationwide delivery options
- Begnon product categories and starter products
- A Store API publishable key for the Next.js storefront
