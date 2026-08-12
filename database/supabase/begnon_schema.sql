-- Begnon / MedusaStore Supabase schema
-- Paste this entire file into the Supabase SQL Editor.
-- Schema name: begnon

create schema if not exists begnon;

create extension if not exists pgcrypto with schema extensions;

create or replace function begnon.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists begnon.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  display_name text,
  email text unique,
  phone text unique,
  avatar_url text,
  customer_tier text not null default 'standard',
  reward_points integer not null default 0 check (reward_points >= 0),
  default_currency text not null default 'GHS',
  medusa_customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- create table if not exists is a no-op against a database that already has
-- this table, so a new column on an existing table needs this explicit
-- statement too (there was no prior "add a column" precedent in this file -
-- every earlier column shipped by being part of the original create table).
alter table begnon.customers add column if not exists medusa_customer_id text;

-- Lets one customer have multiple auth.users identities (email/password,
-- Google, phone OTP) instead of customers.auth_user_id's single link, so
-- the same person using a different login method links to one account
-- rather than colliding with the email/phone unique constraints below.
create table if not exists begnon.customer_auth_identities (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id uuid not null references begnon.customers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function begnon.current_customer_id()
returns uuid
language sql
stable
as $$
  select c.id
  from begnon.customers c
  where c.auth_user_id = auth.uid()
  limit 1
$$;

create table if not exists begnon.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references begnon.customers(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text,
  phone text,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  country text not null default 'GH',
  postal_code text,
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.customer_settings (
  customer_id uuid primary key references begnon.customers(id) on delete cascade,
  sms_order_updates boolean not null default true,
  email_receipts boolean not null default true,
  back_in_stock_alerts boolean not null default true,
  marketing_opt_in boolean not null default false,
  preferred_payment_method text not null default 'paystack',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backs the Arkesel-delivered phone OTP login/signup flow (Supabase's own
-- phone provider only supports Twilio/MessageBird/Vonage/TextLocal, not
-- Arkesel, so codes are generated, hashed, and verified here instead).
create table if not exists begnon.phone_otp_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists begnon.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references begnon.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references begnon.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  subtitle text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  badge text,
  brand text,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  sold_count integer not null default 0 check (sold_count >= 0),
  is_featured boolean not null default false,
  is_flash_deal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references begnon.products(id) on delete cascade,
  url text not null,
  alt text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists begnon.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references begnon.products(id) on delete cascade,
  title text not null,
  sku text not null unique,
  barcode text,
  color text,
  size text,
  price_amount integer not null check (price_amount >= 0),
  compare_at_amount integer check (compare_at_amount is null or compare_at_amount >= price_amount),
  currency text not null default 'GHS',
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  low_stock_threshold integer not null default 5,
  weight_grams integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references begnon.product_variants(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in', 'stock_out', 'reservation', 'release', 'adjustment')),
  quantity integer not null,
  reason text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists begnon.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references begnon.customers(id) on delete cascade,
  product_id uuid not null references begnon.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table if not exists begnon.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references begnon.customers(id) on delete set null,
  anonymous_id text,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  currency text not null default 'GHS',
  subtotal_amount integer not null default 0 check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  shipping_amount integer not null default 0 check (shipping_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references begnon.carts(id) on delete cascade,
  variant_id uuid not null references begnon.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists begnon.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value integer not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references begnon.customers(id) on delete set null,
  cart_id uuid references begnon.carts(id) on delete set null,
  email text,
  phone text,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded')
  ),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  fulfillment_status text not null default 'not_fulfilled' check (
    fulfillment_status in ('not_fulfilled', 'queued', 'packed', 'shipped', 'delivered', 'returned')
  ),
  currency text not null default 'GHS',
  subtotal_amount integer not null default 0 check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  shipping_amount integer not null default 0 check (shipping_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references begnon.orders(id) on delete cascade,
  product_id uuid references begnon.products(id) on delete set null,
  variant_id uuid references begnon.product_variants(id) on delete set null,
  title text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists begnon.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references begnon.orders(id) on delete set null,
  customer_id uuid references begnon.customers(id) on delete set null,
  provider text not null default 'paystack',
  provider_reference text not null unique,
  access_code text,
  authorization_url text,
  status text not null default 'initialized' check (status in ('initialized', 'pending', 'paid', 'failed', 'abandoned', 'refunded')),
  channel text,
  amount integer not null check (amount >= 0),
  currency text not null default 'GHS',
  paid_at timestamptz,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.paystack_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  reference text,
  order_id uuid references begnon.orders(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists begnon.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references begnon.orders(id) on delete cascade,
  carrier text,
  tracking_number text unique,
  status text not null default 'pending' check (status in ('pending', 'packed', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  delivery_fee_amount integer not null default 0 check (delivery_fee_amount >= 0),
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references begnon.orders(id) on delete cascade,
  shipment_id uuid references begnon.shipments(id) on delete cascade,
  status text not null,
  title text not null,
  description text,
  location text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists begnon.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references begnon.customers(id) on delete set null,
  order_id uuid references begnon.orders(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email', 'push')),
  provider text,
  recipient text not null,
  template_key text not null,
  subject text,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed')),
  provider_reference text,
  sent_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.storage_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references begnon.customers(id) on delete set null,
  bucket text not null,
  object_key text not null,
  public_url text,
  content_type text,
  size_bytes bigint,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);

create table if not exists begnon.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'manager', 'support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists begnon.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customers_auth_user_id_idx on begnon.customers(auth_user_id);
create index if not exists customers_email_idx on begnon.customers(email);
create index if not exists products_category_id_idx on begnon.products(category_id);
create index if not exists products_status_idx on begnon.products(status);
create index if not exists products_status_created_at_idx on begnon.products(status, created_at desc);
create index if not exists product_variants_product_id_idx on begnon.product_variants(product_id);
create index if not exists product_variants_active_product_idx on begnon.product_variants(product_id) where is_active = true;
create index if not exists product_media_product_sort_idx on begnon.product_media(product_id, sort_order);
create index if not exists carts_customer_id_idx on begnon.carts(customer_id);
create index if not exists carts_active_customer_idx on begnon.carts(customer_id) where status = 'active';
create index if not exists cart_items_cart_id_idx on begnon.cart_items(cart_id);
create index if not exists categories_active_sort_idx on begnon.categories(sort_order) where is_active = true;
create index if not exists hero_banners_active_sort_idx on begnon.hero_banners(sort_order) where is_active = true;
create index if not exists orders_customer_id_idx on begnon.orders(customer_id);
create index if not exists orders_status_idx on begnon.orders(status);
create index if not exists orders_order_number_idx on begnon.orders(order_number);
create index if not exists payments_reference_idx on begnon.payments(provider_reference);
create index if not exists tracking_events_order_id_idx on begnon.tracking_events(order_id);
create index if not exists notifications_customer_id_idx on begnon.notifications(customer_id);

drop trigger if exists set_customers_updated_at on begnon.customers;
create trigger set_customers_updated_at before update on begnon.customers
for each row execute function begnon.set_updated_at();

drop trigger if exists set_addresses_updated_at on begnon.addresses;
create trigger set_addresses_updated_at before update on begnon.addresses
for each row execute function begnon.set_updated_at();

drop trigger if exists set_customer_settings_updated_at on begnon.customer_settings;
create trigger set_customer_settings_updated_at before update on begnon.customer_settings
for each row execute function begnon.set_updated_at();

drop trigger if exists set_categories_updated_at on begnon.categories;
create trigger set_categories_updated_at before update on begnon.categories
for each row execute function begnon.set_updated_at();

drop trigger if exists set_products_updated_at on begnon.products;
create trigger set_products_updated_at before update on begnon.products
for each row execute function begnon.set_updated_at();

drop trigger if exists set_product_variants_updated_at on begnon.product_variants;
create trigger set_product_variants_updated_at before update on begnon.product_variants
for each row execute function begnon.set_updated_at();

drop trigger if exists set_carts_updated_at on begnon.carts;
create trigger set_carts_updated_at before update on begnon.carts
for each row execute function begnon.set_updated_at();

drop trigger if exists set_cart_items_updated_at on begnon.cart_items;
create trigger set_cart_items_updated_at before update on begnon.cart_items
for each row execute function begnon.set_updated_at();

drop trigger if exists set_discount_codes_updated_at on begnon.discount_codes;
create trigger set_discount_codes_updated_at before update on begnon.discount_codes
for each row execute function begnon.set_updated_at();

drop trigger if exists set_orders_updated_at on begnon.orders;
create trigger set_orders_updated_at before update on begnon.orders
for each row execute function begnon.set_updated_at();

drop trigger if exists set_payments_updated_at on begnon.payments;
create trigger set_payments_updated_at before update on begnon.payments
for each row execute function begnon.set_updated_at();

drop trigger if exists set_shipments_updated_at on begnon.shipments;
create trigger set_shipments_updated_at before update on begnon.shipments
for each row execute function begnon.set_updated_at();

drop trigger if exists set_notifications_updated_at on begnon.notifications;
create trigger set_notifications_updated_at before update on begnon.notifications
for each row execute function begnon.set_updated_at();

drop trigger if exists set_admin_users_updated_at on begnon.admin_users;
create trigger set_admin_users_updated_at before update on begnon.admin_users
for each row execute function begnon.set_updated_at();

create or replace function begnon.is_admin()
returns boolean
language sql
stable
security definer
set search_path = begnon, public
as $$
  select exists (
    select 1
    from begnon.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
$$;

alter table begnon.customers enable row level security;
alter table begnon.addresses enable row level security;
alter table begnon.customer_settings enable row level security;
alter table begnon.categories enable row level security;
alter table begnon.products enable row level security;
alter table begnon.product_media enable row level security;
alter table begnon.product_variants enable row level security;
alter table begnon.inventory_movements enable row level security;
alter table begnon.wishlists enable row level security;
alter table begnon.carts enable row level security;
alter table begnon.cart_items enable row level security;
alter table begnon.discount_codes enable row level security;
alter table begnon.orders enable row level security;
alter table begnon.order_items enable row level security;
alter table begnon.payments enable row level security;
alter table begnon.paystack_events enable row level security;
alter table begnon.shipments enable row level security;
alter table begnon.tracking_events enable row level security;
alter table begnon.notifications enable row level security;
alter table begnon.storage_assets enable row level security;
alter table begnon.admin_users enable row level security;
alter table begnon.audit_log enable row level security;

-- Public catalog reads.
drop policy if exists "public can read active categories" on begnon.categories;
create policy "public can read active categories"
on begnon.categories for select
using (is_active = true);

drop policy if exists "public can read active products" on begnon.products;
create policy "public can read active products"
on begnon.products for select
using (status = 'active');

drop policy if exists "public can read product media" on begnon.product_media;
create policy "public can read product media"
on begnon.product_media for select
using (
  exists (
    select 1 from begnon.products p
    where p.id = product_id and p.status = 'active'
  )
);

drop policy if exists "public can read active variants" on begnon.product_variants;
create policy "public can read active variants"
on begnon.product_variants for select
using (
  is_active = true
  and exists (
    select 1 from begnon.products p
    where p.id = product_id and p.status = 'active'
  )
);

-- Customers can manage their own profile records.
drop policy if exists "customers can read own profile" on begnon.customers;
create policy "customers can read own profile"
on begnon.customers for select
using (auth_user_id = auth.uid() or begnon.is_admin());

drop policy if exists "customers can update own profile" on begnon.customers;
create policy "customers can update own profile"
on begnon.customers for update
using (auth_user_id = auth.uid() or begnon.is_admin())
with check (auth_user_id = auth.uid() or begnon.is_admin());

drop policy if exists "customers can insert own profile" on begnon.customers;
create policy "customers can insert own profile"
on begnon.customers for insert
with check (auth_user_id = auth.uid() or begnon.is_admin());

drop policy if exists "customers manage own addresses" on begnon.addresses;
create policy "customers manage own addresses"
on begnon.addresses for all
using (customer_id = begnon.current_customer_id() or begnon.is_admin())
with check (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers manage own settings" on begnon.customer_settings;
create policy "customers manage own settings"
on begnon.customer_settings for all
using (customer_id = begnon.current_customer_id() or begnon.is_admin())
with check (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers manage own wishlist" on begnon.wishlists;
create policy "customers manage own wishlist"
on begnon.wishlists for all
using (customer_id = begnon.current_customer_id() or begnon.is_admin())
with check (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers read own carts" on begnon.carts;
create policy "customers read own carts"
on begnon.carts for select
using (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers manage own carts" on begnon.carts;
create policy "customers manage own carts"
on begnon.carts for all
using (customer_id = begnon.current_customer_id() or begnon.is_admin())
with check (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers manage own cart items" on begnon.cart_items;
create policy "customers manage own cart items"
on begnon.cart_items for all
using (
  exists (
    select 1 from begnon.carts c
    where c.id = cart_id
      and (c.customer_id = begnon.current_customer_id() or begnon.is_admin())
  )
)
with check (
  exists (
    select 1 from begnon.carts c
    where c.id = cart_id
      and (c.customer_id = begnon.current_customer_id() or begnon.is_admin())
  )
);

drop policy if exists "customers read own orders" on begnon.orders;
create policy "customers read own orders"
on begnon.orders for select
using (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers read own order items" on begnon.order_items;
create policy "customers read own order items"
on begnon.order_items for select
using (
  exists (
    select 1 from begnon.orders o
    where o.id = order_id
      and (o.customer_id = begnon.current_customer_id() or begnon.is_admin())
  )
);

drop policy if exists "customers read own payments" on begnon.payments;
create policy "customers read own payments"
on begnon.payments for select
using (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers read own shipments" on begnon.shipments;
create policy "customers read own shipments"
on begnon.shipments for select
using (
  exists (
    select 1 from begnon.orders o
    where o.id = order_id
      and (o.customer_id = begnon.current_customer_id() or begnon.is_admin())
  )
);

drop policy if exists "customers read own tracking events" on begnon.tracking_events;
create policy "customers read own tracking events"
on begnon.tracking_events for select
using (
  exists (
    select 1 from begnon.orders o
    where o.id = order_id
      and (o.customer_id = begnon.current_customer_id() or begnon.is_admin())
  )
);

drop policy if exists "customers read own notifications" on begnon.notifications;
create policy "customers read own notifications"
on begnon.notifications for select
using (customer_id = begnon.current_customer_id() or begnon.is_admin());

drop policy if exists "customers read own storage assets" on begnon.storage_assets;
create policy "customers read own storage assets"
on begnon.storage_assets for select
using (owner_id = begnon.current_customer_id() or begnon.is_admin());

-- Admin policies for store management.
drop policy if exists "admins manage categories" on begnon.categories;
create policy "admins manage categories" on begnon.categories for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage products" on begnon.products;
create policy "admins manage products" on begnon.products for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage product media" on begnon.product_media;
create policy "admins manage product media" on begnon.product_media for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage variants" on begnon.product_variants;
create policy "admins manage variants" on begnon.product_variants for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage inventory movements" on begnon.inventory_movements;
create policy "admins manage inventory movements" on begnon.inventory_movements for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage discount codes" on begnon.discount_codes;
create policy "admins manage discount codes" on begnon.discount_codes for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage orders" on begnon.orders;
create policy "admins manage orders" on begnon.orders for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage order items" on begnon.order_items;
create policy "admins manage order items" on begnon.order_items for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage payments" on begnon.payments;
create policy "admins manage payments" on begnon.payments for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage paystack events" on begnon.paystack_events;
create policy "admins manage paystack events" on begnon.paystack_events for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage shipments" on begnon.shipments;
create policy "admins manage shipments" on begnon.shipments for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage tracking events" on begnon.tracking_events;
create policy "admins manage tracking events" on begnon.tracking_events for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage notifications" on begnon.notifications;
create policy "admins manage notifications" on begnon.notifications for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage storage assets" on begnon.storage_assets;
create policy "admins manage storage assets" on begnon.storage_assets for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins manage admin users" on begnon.admin_users;
create policy "admins manage admin users" on begnon.admin_users for all
using (begnon.is_admin()) with check (begnon.is_admin());

drop policy if exists "admins read audit log" on begnon.audit_log;
create policy "admins read audit log" on begnon.audit_log for select
using (begnon.is_admin());

drop policy if exists "admins insert audit log" on begnon.audit_log;
create policy "admins insert audit log" on begnon.audit_log for insert
with check (begnon.is_admin());

-- Seed storefront categories.
insert into begnon.categories (name, slug, description, sort_order)
values
  ('Consumer electronics', 'consumer-electronics', 'Phones, earbuds, lamps, and gadgets.', 10),
  ('Fashion & apparel', 'fashion-apparel', 'Clothing, footwear, and everyday style.', 20),
  ('Beauty & personal care', 'beauty-personal-care', 'Skincare, grooming, and beauty bundles.', 30),
  ('Home & kitchen', 'home-kitchen', 'Appliances and essentials for the home.', 40),
  ('Phones & accessories', 'phones-accessories', 'Cases, screen protectors, chargers, and mobile accessories.', 50),
  ('Office supplies', 'office-supplies', 'Retail and office operating supplies.', 60),
  ('Packaging', 'packaging', 'Mailer bags, takeaway bowls, and packaging products.', 70)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Seed products and variants.
with product_seed as (
  select *
  from (values
    ('TWS Bluetooth Earbuds Pro Case', 'tws-bluetooth-earbuds-pro-case', 'Consumer electronics', 'Ready to ship', 48, 11800, 15000, 4.8, 2480),
    ('Premium Ankara Two-Piece Set', 'premium-ankara-two-piece-set', 'Fashion & apparel', 'New', 16, 16500, 21000, 4.9, 940),
    ('Matte Black Takeaway Bowls', 'matte-black-takeaway-bowls', 'Packaging', 'Bulk saver', 5000, 200, 300, 4.7, 18000),
    ('Solar Rechargeable Desk Lamps', 'solar-rechargeable-desk-lamps', 'Home & kitchen', 'Fast dispatch', 86, 7200, 9600, 4.6, 1280),
    ('Natural Glow Skincare Bundle', 'natural-glow-skincare-bundle', 'Beauty & personal care', 'Top rated', 120, 9500, 13000, 4.9, 3120),
    ('Tempered Glass Screen Protectors', 'tempered-glass-screen-protectors', 'Phones & accessories', 'Best seller', 2500, 800, 1200, 4.8, 9600),
    ('Restaurant POS Thermal Rolls', 'restaurant-pos-thermal-rolls', 'Office supplies', 'Paystack ready', 900, 700, 1000, 4.7, 4300),
    ('Commercial Blender 2L Heavy Duty', 'commercial-blender-2l-heavy-duty', 'Home & kitchen', 'Warranty', 24, 42000, 52000, 4.6, 780)
  ) as v(title, slug, category_name, badge, inventory_quantity, price_amount, compare_at_amount, rating, sold_count)
),
upsert_products as (
  insert into begnon.products (
    category_id,
    title,
    slug,
    description,
    status,
    badge,
    rating,
    sold_count,
    is_featured,
    is_flash_deal
  )
  select
    c.id,
    ps.title,
    ps.slug,
    ps.title || ' available for fast checkout and delivery.',
    'active',
    ps.badge,
    ps.rating,
    ps.sold_count,
    true,
    ps.compare_at_amount > ps.price_amount
  from product_seed ps
  join begnon.categories c on c.name = ps.category_name
  on conflict (slug) do update set
    category_id = excluded.category_id,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    badge = excluded.badge,
    rating = excluded.rating,
    sold_count = excluded.sold_count,
    is_featured = excluded.is_featured,
    is_flash_deal = excluded.is_flash_deal,
    updated_at = now()
  returning id, slug
)
insert into begnon.product_variants (
  product_id,
  title,
  sku,
  price_amount,
  compare_at_amount,
  currency,
  inventory_quantity,
  is_active
)
select
  p.id,
  'Default',
  'EMB-' || upper(replace(ps.slug, '-', '_')),
  ps.price_amount,
  ps.compare_at_amount,
  'GHS',
  ps.inventory_quantity,
  true
from product_seed ps
join upsert_products p on p.slug = ps.slug
on conflict (sku) do update set
  price_amount = excluded.price_amount,
  compare_at_amount = excluded.compare_at_amount,
  inventory_quantity = excluded.inventory_quantity,
  is_active = true,
  updated_at = now();

-- Useful views for the frontend.
create or replace view begnon.product_cards as
select
  p.id,
  p.title,
  p.slug,
  p.badge,
  p.rating,
  p.sold_count,
  c.name as category_name,
  v.id as variant_id,
  v.sku,
  v.price_amount,
  v.compare_at_amount,
  v.currency,
  v.inventory_quantity,
  case
    when v.inventory_quantity <= 0 then 'Out of stock'
    when v.inventory_quantity <= v.low_stock_threshold then 'Low stock'
    else 'In stock'
  end as stock_status
from begnon.products p
join begnon.product_variants v on v.product_id = p.id and v.is_active = true
left join begnon.categories c on c.id = p.category_id
where p.status = 'active';

create or replace view begnon.customer_order_summary as
select
  o.id,
  o.order_number,
  o.customer_id,
  o.status,
  o.payment_status,
  o.fulfillment_status,
  o.total_amount,
  o.currency,
  o.placed_at,
  count(oi.id) as item_count
from begnon.orders o
left join begnon.order_items oi on oi.order_id = o.id
group by o.id;

-- Customer rows are created/linked by application code
-- (ensureCustomerForAuthUser in src/lib/db/customers.ts) after every
-- successful sign-in, not by a trigger here. A trigger firing directly on
-- auth.users insert can't apply the verified-email/phone matching that
-- links a second login method (e.g. phone OTP) to an existing account
-- instead of creating a duplicate - it always races ahead of that logic
-- with a naive insert. A prior version of this schema had exactly that
-- trigger (create_medusastore_customer_after_auth_signup); drop it if
-- restoring this file onto a database that still has it:
--   drop trigger if exists create_medusastore_customer_after_auth_signup on auth.users;
--   drop function if exists begnon.create_customer_for_auth_user();

-- Homepage hero merchandising banners.
create table if not exists begnon.hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_hero_banners_updated_at on begnon.hero_banners;
create trigger set_hero_banners_updated_at before update on begnon.hero_banners
for each row execute function begnon.set_updated_at();

alter table begnon.hero_banners enable row level security;

drop policy if exists "public can read active hero banners" on begnon.hero_banners;
create policy "public can read active hero banners"
on begnon.hero_banners for select
using (is_active = true);

drop policy if exists "admins manage hero banners" on begnon.hero_banners;
create policy "admins manage hero banners" on begnon.hero_banners for all
using (begnon.is_admin()) with check (begnon.is_admin());

-- Footer "new drops, sale alerts, back-in-stock" email signup. Written only
-- via the app's own pooled Postgres connection (src/lib/db/newsletter.ts),
-- same as phone_otp_codes - RLS is enabled with no public policies purely as
-- defense in depth against ever exposing subscriber emails through the
-- anon/authenticated PostgREST role.
create table if not exists begnon.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists newsletter_subscribers_email_idx on begnon.newsletter_subscribers(email);

alter table begnon.newsletter_subscribers enable row level security;
