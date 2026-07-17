import { getSql } from "@/lib/db/client";

export type WishlistItem = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  category: string;
};

export async function getWishlist(customerId: string): Promise<WishlistItem[]> {
  const sql = getSql();
  const rows = await sql<
    { product_id: string; title: string; slug: string; image: string | null; price_amount: number | null; category_name: string | null }[]
  >`
    select
      p.id as product_id, p.title, p.slug,
      media.url as image,
      variants.price_amount,
      c.name as category_name
    from medusastore.wishlists w
    join medusastore.products p on p.id = w.product_id
    left join medusastore.categories c on c.id = p.category_id
    left join lateral (
      select pm.url from medusastore.product_media pm
      where pm.product_id = p.id order by pm.sort_order limit 1
    ) media on true
    left join lateral (
      select min(v.price_amount) as price_amount
      from medusastore.product_variants v where v.product_id = p.id and v.is_active = true
    ) variants on true
    where w.customer_id = ${customerId}
    order by w.created_at desc
  `;

  return rows.map((row) => ({
    productId: row.product_id,
    name: row.title,
    slug: row.slug,
    image: row.image ?? "/assets/products/placeholder.svg",
    price: (row.price_amount ?? 0) / 100,
    category: row.category_name ?? "General",
  }));
}

export async function toggleWishlistItem(customerId: string, productId: string) {
  const sql = getSql();
  const existing = await sql<{ id: string }[]>`
    select id from medusastore.wishlists where customer_id = ${customerId} and product_id = ${productId}
  `;

  if (existing.length > 0) {
    await sql`delete from medusastore.wishlists where id = ${existing[0].id}`;
    return { inWishlist: false };
  }

  await sql`insert into medusastore.wishlists (customer_id, product_id) values (${customerId}, ${productId})`;
  return { inWishlist: true };
}
