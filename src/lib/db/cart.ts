import { getSql } from "@/lib/db/client";

export type CartLineItem = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
};

export type CartWithItems = {
  id: string;
  customerId: string | null;
  items: CartLineItem[];
  totals: {
    quantity: number;
    subtotal: number;
    shipping: number;
    total: number;
  };
};

const SHIPPING_AMOUNT_PESEWAS = 4500;

async function recomputeCartTotals(cartId: string) {
  const sql = getSql();
  const [row] = await sql<{ subtotal: string | null; item_count: string | null }[]>`
    select sum(line_total_amount) as subtotal, sum(quantity) as item_count
    from medusastore.cart_items
    where cart_id = ${cartId}
  `;

  const subtotal = Number(row?.subtotal ?? 0);
  const itemCount = Number(row?.item_count ?? 0);
  const shipping = itemCount > 0 ? SHIPPING_AMOUNT_PESEWAS : 0;

  await sql`
    update medusastore.carts set
      subtotal_amount = ${subtotal},
      shipping_amount = ${shipping},
      total_amount = ${subtotal + shipping}
    where id = ${cartId}
  `;
}

export async function getActiveCart(cartId: string | undefined, customerId: string | undefined) {
  const sql = getSql();

  if (customerId) {
    const [existing] = await sql<{ id: string }[]>`
      select id from medusastore.carts where customer_id = ${customerId} and status = 'active' limit 1
    `;
    if (existing) return existing.id;
  }

  if (cartId) {
    const [existing] = await sql<{ id: string }[]>`
      select id from medusastore.carts where id = ${cartId} and status = 'active' limit 1
    `;
    if (existing) {
      if (customerId) {
        await sql`update medusastore.carts set customer_id = ${customerId} where id = ${existing.id}`;
      }
      return existing.id;
    }
  }

  const [created] = await sql<{ id: string }[]>`
    insert into medusastore.carts (customer_id) values (${customerId ?? null}) returning id
  `;

  return created.id;
}

export async function getCartWithItems(cartId: string): Promise<CartWithItems> {
  const sql = getSql();

  const [cart] = await sql<{ id: string; customer_id: string | null }[]>`
    select id, customer_id from medusastore.carts where id = ${cartId}
  `;

  const rows = await sql<
    {
      id: string;
      variant_id: string;
      product_id: string;
      slug: string;
      title: string;
      image: string | null;
      unit_price_amount: number;
      size: string | null;
      color: string | null;
      quantity: number;
      line_total_amount: number;
    }[]
  >`
    select
      ci.id,
      ci.variant_id,
      p.id as product_id,
      p.slug,
      p.title,
      media.url as image,
      ci.unit_price_amount,
      v.size,
      v.color,
      ci.quantity,
      ci.line_total_amount
    from medusastore.cart_items ci
    join medusastore.product_variants v on v.id = ci.variant_id
    join medusastore.products p on p.id = v.product_id
    left join lateral (
      select pm.url from medusastore.product_media pm
      where pm.product_id = p.id order by pm.sort_order limit 1
    ) media on true
    where ci.cart_id = ${cartId}
    order by ci.created_at asc
  `;

  const items: CartLineItem[] = rows.map((row) => ({
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    slug: row.slug,
    name: row.title,
    image: row.image ?? "/assets/products/placeholder.svg",
    price: row.unit_price_amount / 100,
    size: row.size ?? "",
    color: row.color ?? "",
    quantity: row.quantity,
    lineTotal: row.line_total_amount / 100,
  }));

  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = quantity > 0 ? SHIPPING_AMOUNT_PESEWAS / 100 : 0;

  return {
    id: cartId,
    customerId: cart?.customer_id ?? null,
    items,
    totals: { quantity, subtotal, shipping, total: subtotal + shipping },
  };
}

export async function addCartItem(cartId: string, variantId: string, quantity: number) {
  const sql = getSql();

  const [variant] = await sql<{ price_amount: number }[]>`
    select price_amount from medusastore.product_variants where id = ${variantId} and is_active = true
  `;
  if (!variant) throw new Error("Product variant not found.");

  const increment = Math.max(1, quantity);
  const lineTotal = variant.price_amount * increment;

  await sql`
    insert into medusastore.cart_items (cart_id, variant_id, quantity, unit_price_amount, line_total_amount)
    values (${cartId}, ${variantId}, ${increment}, ${variant.price_amount}, ${lineTotal})
    on conflict (cart_id, variant_id) do update set
      quantity = medusastore.cart_items.quantity + excluded.quantity,
      unit_price_amount = excluded.unit_price_amount,
      line_total_amount = (medusastore.cart_items.quantity + excluded.quantity) * excluded.unit_price_amount,
      updated_at = now()
  `;

  await recomputeCartTotals(cartId);
}

export async function updateCartItemQuantity(cartId: string, itemId: string, quantity: number) {
  const sql = getSql();

  if (quantity <= 0) {
    await sql`delete from medusastore.cart_items where id = ${itemId} and cart_id = ${cartId}`;
  } else {
    await sql`
      update medusastore.cart_items set
        quantity = ${quantity},
        line_total_amount = unit_price_amount * ${quantity},
        updated_at = now()
      where id = ${itemId} and cart_id = ${cartId}
    `;
  }

  await recomputeCartTotals(cartId);
}

export async function removeCartItem(cartId: string, itemId: string) {
  const sql = getSql();
  await sql`delete from medusastore.cart_items where id = ${itemId} and cart_id = ${cartId}`;
  await recomputeCartTotals(cartId);
}

export async function mergeGuestCartIntoCustomerCart(guestCartId: string, customerId: string) {
  const sql = getSql();

  const customerCartId = await getActiveCart(undefined, customerId);
  if (customerCartId === guestCartId) return customerCartId;

  const guestItems = await sql<{ variant_id: string; quantity: number }[]>`
    select variant_id, quantity from medusastore.cart_items where cart_id = ${guestCartId}
  `;

  for (const item of guestItems) {
    await addCartItem(customerCartId, item.variant_id, item.quantity);
  }

  await sql`update medusastore.carts set status = 'converted' where id = ${guestCartId}`;

  return customerCartId;
}
