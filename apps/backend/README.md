# SobalShop Medusa Backend

Official MedusaJS v2 backend for SobalShop commerce operations.

## Local Setup

```bash
cp .env.template .env
npm install
npm run dev
```

Medusa runs on `http://localhost:9000`; the admin dashboard is available at `http://localhost:9000/app`.

## Required Environment

- `DATABASE_URL`: Supabase Postgres connection string
- `REDIS_URL`: Redis connection string
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

- SobalShop store
- Ghana region using `GHS`
- Same-day Accra and nationwide delivery options
- SobalShop product categories and starter products
- A Store API publishable key for the Next.js storefront
