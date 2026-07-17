import { getSql } from "@/lib/db/client";

export type HeroBanner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
};

export async function getActiveHeroBanners(): Promise<HeroBanner[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      title: string;
      subtitle: string | null;
      image_url: string | null;
      cta_label: string | null;
      cta_href: string | null;
    }[]
  >`
    select id, title, subtitle, image_url, cta_label, cta_href
    from medusastore.hero_banners
    where is_active = true
    order by sort_order asc
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageUrl: row.image_url ?? "",
    ctaLabel: row.cta_label ?? "",
    ctaHref: row.cta_href ?? "/shop",
  }));
}
