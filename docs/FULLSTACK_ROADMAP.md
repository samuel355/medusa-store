# Ember Commerce Fullstack Roadmap

## Build Order

1. Storefront experience
   - Expand the homepage from a simple showcase into a real commerce surface.
   - Add category entry points, product rails, featured campaigns, social proof, checkout confidence, delivery promises, and app/PWA moments.
   - Keep the orange-red premium brand direction consistent across desktop and mobile.

2. Product and catalog foundation
   - Decide whether Medusa owns catalog/order data or whether Supabase owns custom commerce tables.
   - Model products, variants, collections, prices, inventory, media, and availability.
   - Connect product cards and rails to live catalog APIs.

3. Authentication
   - Complete Supabase phone OTP sign-in.
   - Add email/password sign-up and login.
   - Add Google OAuth callback handling.
   - Normalize user profiles so phone, email, and Google identities map to one customer record.

4. Cart and checkout
   - Build persistent carts for anonymous and signed-in shoppers.
   - Add shipping zones, delivery quotes, taxes, promo codes, and order summaries.
   - Initialize Paystack transactions only after a valid order intent exists.

5. Payment webhooks and order lifecycle
   - Verify Paystack webhooks.
   - Mark orders paid idempotently.
   - Push paid orders into BullMQ fulfillment and notification queues.

6. Messaging
   - Send Arkesel SMS for OTP support, order confirmation, delivery updates, and back-in-stock alerts.
   - Add retry logic, rate limits, and delivery logging.

7. Storage and media
   - Store product media, category art, receipts, and admin uploads in Cloudflare R2.
   - Add image optimization and cache policies.

8. Performance
   - Cache catalog reads aggressively.
   - Use Redis for hot product/category data, rate limits, and queue infrastructure.
   - Keep initial storefront payload lean and PWA-ready.

9. Admin and operations
   - Add admin workflows for products, inventory, orders, customers, refunds, and campaigns.
   - Add worker boot scripts and production process docs.

10. Quality gates
    - Add unit tests for adapters and payment signature verification.
    - Add Playwright coverage for homepage, auth, cart, and checkout.
    - Run typecheck, production build, audit review, and Lighthouse checks before deployment.

## Current Sprint

1. Expand the homepage into a fuller premium storefront.
2. Keep integration adapters typed and build-safe.
3. Verify the app still typechecks and builds after each major UI expansion.
