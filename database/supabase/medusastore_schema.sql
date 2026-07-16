-- Ember / MedusaStore Supabase schema
-- Paste this entire file into the Supabase SQL Editor.
-- Schema name: medusastore

create schema if not exists medusastore;

create extension if not exists pgcrypto with schema extensions;

create or replace function medusastore.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists medusastore.customers (
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function medusastore.current_customer_id()
returns uuid
language sql
stable
as $$
  select c.id
  from medusastore.customers c
  where c.auth_user_id = auth.uid()
  limit 1
$$;

create table if not exists medusastore.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references medusastore.customers(id) on delete cascade,
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

create table if not exists medusastore.customer_settings (
  customer_id uuid primary key references medusastore.customers(id) on delete cascade,
  sms_order_updates boolean not null default true,
  email_receipts boolean not null default true,
  back_in_stock_alerts boolean not null default true,
  marketing_opt_in boolean not null default false,
  preferred_payment_method text not null default 'paystack',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists medusastore.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references medusastore.categories(id) on delete set null,
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

create table if not exists medusastore.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references medusastore.categories(id) on delete set null,
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

create table if not exists medusastore.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references medusastore.products(id) on delete cascade,
  url text not null,
  alt text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists medusastore.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references medusastore.products(id) on delete cascade,
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

create table if not exists medusastore.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references medusastore.product_variants(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in', 'stock_out', 'reservation', 'release', 'adjustment')),
  quantity integer not null,
  reason text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists medusastore.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references medusastore.customers(id) on delete cascade,
  product_id uuid not null references medusastore.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table if not exists medusastore.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references medusastore.customers(id) on delete set null,
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

create table if not exists medusastore.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references medusastore.carts(id) on delete cascade,
  variant_id uuid not null references medusastore.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists medusastore.discount_codes (
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

create table if not exists medusastore.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references medusastore.customers(id) on delete set null,
  cart_id uuid references medusastore.carts(id) on delete set null,
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

create table if not exists medusastore.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references medusastore.orders(id) on delete cascade,
  product_id uuid references medusastore.products(id) on delete set null,
  variant_id uuid references medusastore.product_variants(id) on delete set null,
  title text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists medusastore.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references medusastore.orders(id) on delete set null,
  customer_id uuid references medusastore.customers(id) on delete set null,
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

create table if not exists medusastore.paystack_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  reference text,
  order_id uuid references medusastore.orders(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists medusastore.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references medusastore.orders(id) on delete cascade,
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

create table if not exists medusastore.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references medusastore.orders(id) on delete cascade,
  shipment_id uuid references medusastore.shipments(id) on delete cascade,
  status text not null,
  title text not null,
  description text,
  location text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists medusastore.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references medusastore.customers(id) on delete set null,
  order_id uuid references medusastore.orders(id) on delete cascade,
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

create table if not exists medusastore.storage_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references medusastore.customers(id) on delete set null,
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

create table if not exists medusastore.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'manager', 'support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists medusastore.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customers_auth_user_id_idx on medusastore.customers(auth_user_id);
create index if not exists customers_email_idx on medusastore.customers(email);
create index if not exists products_category_id_idx on medusastore.products(category_id);
create index if not exists products_status_idx on medusastore.products(status);
create index if not exists product_variants_product_id_idx on medusastore.product_variants(product_id);
create index if not exists carts_customer_id_idx on medusastore.carts(customer_id);
create index if not exists orders_customer_id_idx on medusastore.orders(customer_id);
create index if not exists orders_status_idx on medusastore.orders(status);
create index if not exists orders_order_number_idx on medusastore.orders(order_number);
create index if not exists payments_reference_idx on medusastore.payments(provider_reference);
create index if not exists tracking_events_order_id_idx on medusastore.tracking_events(order_id);
create index if not exists notifications_customer_id_idx on medusastore.notifications(customer_id);

drop trigger if exists set_customers_updated_at on medusastore.customers;
create trigger set_customers_updated_at before update on medusastore.customers
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_addresses_updated_at on medusastore.addresses;
create trigger set_addresses_updated_at before update on medusastore.addresses
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_customer_settings_updated_at on medusastore.customer_settings;
create trigger set_customer_settings_updated_at before update on medusastore.customer_settings
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_categories_updated_at on medusastore.categories;
create trigger set_categories_updated_at before update on medusastore.categories
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_products_updated_at on medusastore.products;
create trigger set_products_updated_at before update on medusastore.products
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_product_variants_updated_at on medusastore.product_variants;
create trigger set_product_variants_updated_at before update on medusastore.product_variants
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_carts_updated_at on medusastore.carts;
create trigger set_carts_updated_at before update on medusastore.carts
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_cart_items_updated_at on medusastore.cart_items;
create trigger set_cart_items_updated_at before update on medusastore.cart_items
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_discount_codes_updated_at on medusastore.discount_codes;
create trigger set_discount_codes_updated_at before update on medusastore.discount_codes
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_orders_updated_at on medusastore.orders;
create trigger set_orders_updated_at before update on medusastore.orders
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_payments_updated_at on medusastore.payments;
create trigger set_payments_updated_at before update on medusastore.payments
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_shipments_updated_at on medusastore.shipments;
create trigger set_shipments_updated_at before update on medusastore.shipments
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_notifications_updated_at on medusastore.notifications;
create trigger set_notifications_updated_at before update on medusastore.notifications
for each row execute function medusastore.set_updated_at();

drop trigger if exists set_admin_users_updated_at on medusastore.admin_users;
create trigger set_admin_users_updated_at before update on medusastore.admin_users
for each row execute function medusastore.set_updated_at();

create or replace function medusastore.is_admin()
returns boolean
language sql
stable
security definer
set search_path = medusastore, public
as $$
  select exists (
    select 1
    from medusastore.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
  )
$$;

alter table medusastore.customers enable row level security;
alter table medusastore.addresses enable row level security;
alter table medusastore.customer_settings enable row level security;
alter table medusastore.categories enable row level security;
alter table medusastore.products enable row level security;
alter table medusastore.product_media enable row level security;
alter table medusastore.product_variants enable row level security;
alter table medusastore.inventory_movements enable row level security;
alter table medusastore.wishlists enable row level security;
alter table medusastore.carts enable row level security;
alter table medusastore.cart_items enable row level security;
alter table medusastore.discount_codes enable row level security;
alter table medusastore.orders enable row level security;
alter table medusastore.order_items enable row level security;
alter table medusastore.payments enable row level security;
alter table medusastore.paystack_events enable row level security;
alter table medusastore.shipments enable row level security;
alter table medusastore.tracking_events enable row level security;
alter table medusastore.notifications enable row level security;
alter table medusastore.storage_assets enable row level security;
alter table medusastore.admin_users enable row level security;
alter table medusastore.audit_log enable row level security;

-- Public catalog reads.
drop policy if exists "public can read active categories" on medusastore.categories;
create policy "public can read active categories"
on medusastore.categories for select
using (is_active = true);

drop policy if exists "public can read active products" on medusastore.products;
create policy "public can read active products"
on medusastore.products for select
using (status = 'active');

drop policy if exists "public can read product media" on medusastore.product_media;
create policy "public can read product media"
on medusastore.product_media for select
using (
  exists (
    select 1 from medusastore.products p
    where p.id = product_id and p.status = 'active'
  )
);

drop policy if exists "public can read active variants" on medusastore.product_variants;
create policy "public can read active variants"
on medusastore.product_variants for select
using (
  is_active = true
  and exists (
    select 1 from medusastore.products p
    where p.id = product_id and p.status = 'active'
  )
);

-- Customers can manage their own profile records.
drop policy if exists "customers can read own profile" on medusastore.customers;
create policy "customers can read own profile"
on medusastore.customers for select
using (auth_user_id = auth.uid() or medusastore.is_admin());

drop policy if exists "customers can update own profile" on medusastore.customers;
create policy "customers can update own profile"
on medusastore.customers for update
using (auth_user_id = auth.uid() or medusastore.is_admin())
with check (auth_user_id = auth.uid() or medusastore.is_admin());

drop policy if exists "customers can insert own profile" on medusastore.customers;
create policy "customers can insert own profile"
on medusastore.customers for insert
with check (auth_user_id = auth.uid() or medusastore.is_admin());

drop policy if exists "customers manage own addresses" on medusastore.addresses;
create policy "customers manage own addresses"
on medusastore.addresses for all
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin())
with check (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers manage own settings" on medusastore.customer_settings;
create policy "customers manage own settings"
on medusastore.customer_settings for all
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin())
with check (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers manage own wishlist" on medusastore.wishlists;
create policy "customers manage own wishlist"
on medusastore.wishlists for all
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin())
with check (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers read own carts" on medusastore.carts;
create policy "customers read own carts"
on medusastore.carts for select
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers manage own carts" on medusastore.carts;
create policy "customers manage own carts"
on medusastore.carts for all
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin())
with check (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers manage own cart items" on medusastore.cart_items;
create policy "customers manage own cart items"
on medusastore.cart_items for all
using (
  exists (
    select 1 from medusastore.carts c
    where c.id = cart_id
      and (c.customer_id = medusastore.current_customer_id() or medusastore.is_admin())
  )
)
with check (
  exists (
    select 1 from medusastore.carts c
    where c.id = cart_id
      and (c.customer_id = medusastore.current_customer_id() or medusastore.is_admin())
  )
);

drop policy if exists "customers read own orders" on medusastore.orders;
create policy "customers read own orders"
on medusastore.orders for select
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers read own order items" on medusastore.order_items;
create policy "customers read own order items"
on medusastore.order_items for select
using (
  exists (
    select 1 from medusastore.orders o
    where o.id = order_id
      and (o.customer_id = medusastore.current_customer_id() or medusastore.is_admin())
  )
);

drop policy if exists "customers read own payments" on medusastore.payments;
create policy "customers read own payments"
on medusastore.payments for select
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers read own shipments" on medusastore.shipments;
create policy "customers read own shipments"
on medusastore.shipments for select
using (
  exists (
    select 1 from medusastore.orders o
    where o.id = order_id
      and (o.customer_id = medusastore.current_customer_id() or medusastore.is_admin())
  )
);

drop policy if exists "customers read own tracking events" on medusastore.tracking_events;
create policy "customers read own tracking events"
on medusastore.tracking_events for select
using (
  exists (
    select 1 from medusastore.orders o
    where o.id = order_id
      and (o.customer_id = medusastore.current_customer_id() or medusastore.is_admin())
  )
);

drop policy if exists "customers read own notifications" on medusastore.notifications;
create policy "customers read own notifications"
on medusastore.notifications for select
using (customer_id = medusastore.current_customer_id() or medusastore.is_admin());

drop policy if exists "customers read own storage assets" on medusastore.storage_assets;
create policy "customers read own storage assets"
on medusastore.storage_assets for select
using (owner_id = medusastore.current_customer_id() or medusastore.is_admin());

-- Admin policies for store management.
drop policy if exists "admins manage categories" on medusastore.categories;
create policy "admins manage categories" on medusastore.categories for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage products" on medusastore.products;
create policy "admins manage products" on medusastore.products for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage product media" on medusastore.product_media;
create policy "admins manage product media" on medusastore.product_media for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage variants" on medusastore.product_variants;
create policy "admins manage variants" on medusastore.product_variants for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage inventory movements" on medusastore.inventory_movements;
create policy "admins manage inventory movements" on medusastore.inventory_movements for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage discount codes" on medusastore.discount_codes;
create policy "admins manage discount codes" on medusastore.discount_codes for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage orders" on medusastore.orders;
create policy "admins manage orders" on medusastore.orders for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage order items" on medusastore.order_items;
create policy "admins manage order items" on medusastore.order_items for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage payments" on medusastore.payments;
create policy "admins manage payments" on medusastore.payments for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage paystack events" on medusastore.paystack_events;
create policy "admins manage paystack events" on medusastore.paystack_events for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage shipments" on medusastore.shipments;
create policy "admins manage shipments" on medusastore.shipments for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage tracking events" on medusastore.tracking_events;
create policy "admins manage tracking events" on medusastore.tracking_events for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage notifications" on medusastore.notifications;
create policy "admins manage notifications" on medusastore.notifications for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage storage assets" on medusastore.storage_assets;
create policy "admins manage storage assets" on medusastore.storage_assets for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins manage admin users" on medusastore.admin_users;
create policy "admins manage admin users" on medusastore.admin_users for all
using (medusastore.is_admin()) with check (medusastore.is_admin());

drop policy if exists "admins read audit log" on medusastore.audit_log;
create policy "admins read audit log" on medusastore.audit_log for select
using (medusastore.is_admin());

drop policy if exists "admins insert audit log" on medusastore.audit_log;
create policy "admins insert audit log" on medusastore.audit_log for insert
with check (medusastore.is_admin());

-- Seed storefront categories.
insert into medusastore.categories (name, slug, description, sort_order)
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
  insert into medusastore.products (
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
  join medusastore.categories c on c.name = ps.category_name
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
insert into medusastore.product_variants (
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
join medusastore.products p on p.slug = ps.slug
on conflict (sku) do update set
  price_amount = excluded.price_amount,
  compare_at_amount = excluded.compare_at_amount,
  inventory_quantity = excluded.inventory_quantity,
  is_active = true,
  updated_at = now();

-- Useful views for the frontend.
create or replace view medusastore.product_cards as
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
from medusastore.products p
join medusastore.product_variants v on v.product_id = p.id and v.is_active = true
left join medusastore.categories c on c.id = p.category_id
where p.status = 'active';

create or replace view medusastore.customer_order_summary as
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
from medusastore.orders o
left join medusastore.order_items oi on oi.order_id = o.id
group by o.id;

-- Optional helper for creating customer rows after Supabase Auth signup.
create or replace function medusastore.create_customer_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = medusastore, public
as $$
begin
  insert into medusastore.customers (auth_user_id, email, phone, display_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, new.phone)
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_medusastore_customer_after_auth_signup on auth.users;
create trigger create_medusastore_customer_after_auth_signup
after insert on auth.users
for each row execute function medusastore.create_customer_for_auth_user();
