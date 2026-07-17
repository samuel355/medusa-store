import { getSql } from "@/lib/db/client";

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
};

export async function getActiveCategories(): Promise<StoreCategory[]> {
  const sql = getSql();
  const rows = await sql<
    { id: string; name: string; slug: string; description: string | null; image_url: string | null }[]
  >`
    select id, name, slug, description, image_url
    from medusastore.categories
    where is_active = true
    order by sort_order asc
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
  }));
}
