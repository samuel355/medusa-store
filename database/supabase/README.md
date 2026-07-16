# Supabase Database

Paste `medusastore_schema.sql` into the Supabase SQL Editor.

It creates the `medusastore` schema with:

- customers, addresses, customer settings
- categories, products, product media, variants, inventory movements
- wishlists, carts, cart items, discount codes
- orders, order items, payments, Paystack webhook events
- shipments, tracking events, notifications
- R2/storage asset records
- admin users and audit log
- RLS policies for public catalog reads, customer-owned records, and admin management
- seed categories/products matching the current storefront
- frontend views: `product_cards`, `customer_order_summary`
- auth trigger to create a `medusastore.customers` row after Supabase Auth signup

After running it, create your first admin by inserting your Supabase Auth user id:

```sql
insert into medusastore.admin_users (auth_user_id, role)
values ('YOUR_AUTH_USER_ID', 'owner');
```
