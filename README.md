# Ember Commerce

Modern ecommerce storefront foundation with a premium PWA UI and integration boundaries for:

- Supabase Postgres/Auth: phone OTP, email/password, Google OAuth
- Paystack: card and mobile money checkout initialization plus signed webhooks
- Redis + BullMQ: fulfillment and SMS notification queues
- Arkesel: SMS notifications
- Cloudflare R2: object storage

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in provider credentials before exercising auth, payment, queues, SMS, or storage.

## Next implementation steps

1. Connect catalog, cart, order, and fulfillment data to Medusa or custom Supabase tables.
2. Add Supabase auth callbacks and session persistence in the storefront.
3. Add worker boot scripts for deployment targets.
4. Add product image upload flows backed by R2.
5. Add checkout order creation before Paystack initialization.
