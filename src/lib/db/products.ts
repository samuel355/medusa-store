import { getSql } from "@/lib/db/client";

export type BranchStock = {
  location: string;
  quantity: number;
  lowStockThreshold: number;
};

export type StoreProduct = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string;
  collection: string;
  image: string;
  images: string[];
  price: number;
  oldPrice: number;
  stock: string;
  rating: string;
  orders: string;
  badge: string;
  description: string;
  highlights: string[];
  delivery: string;
  warranty: string;
  sizes: string[];
  colors: string[];
  fit: "Slim" | "Regular" | "Oversized" | "Tailored";
  fabric: string;
  gender: "Men" | "Women" | "Unisex";
  occasion: string[];
  brand: string;
  sku: string;
  discountEligible: boolean;
  weight: number;
  status: "Published" | "Draft" | "Archived";
  branchStock: BranchStock[];
  care: string;
  popularity: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  categoryId: string | null;
};

type ProductMetadata = Partial<{
  subcategory: string;
  collection: string;
  highlights: string[];
  delivery: string;
  warranty: string;
  fit: StoreProduct["fit"];
  fabric: string;
  gender: StoreProduct["gender"];
  occasion: string[];
  brand: string;
  care: string;
  branchStock: BranchStock[];
}>;

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  badge: string | null;
  rating: string | null;
  sold_count: number;
  is_flash_deal: boolean;
  metadata: ProductMetadata | null;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  images: string[] | null;
  variant_id: string | null;
  sku: string | null;
  price_amount: number | null;
  compare_at_amount: number | null;
  inventory_quantity: number | null;
  weight_grams: number | null;
  sizes: string[] | null;
  colors: string[] | null;
  avg_sold_count: string | null;
};

const PRODUCT_SELECT = `
  select
    p.id,
    p.title,
    p.slug,
    p.description,
    p.status,
    p.badge,
    p.rating,
    p.sold_count,
    p.is_flash_deal,
    p.metadata,
    p.created_at,
    p.category_id,
    c.name as category_name,
    media.images,
    variants.variant_id,
    variants.sku,
    variants.price_amount,
    variants.compare_at_amount,
    variants.inventory_quantity,
    variants.weight_grams,
    variants.sizes,
    variants.colors,
    (select avg(sold_count) from medusastore.products where status = 'active') as avg_sold_count
  from medusastore.products p
  left join medusastore.categories c on c.id = p.category_id
  left join lateral (
    select array_agg(pm.url order by pm.sort_order) as images
    from medusastore.product_media pm
    where pm.product_id = p.id
  ) media on true
  left join lateral (
    select
      (array_agg(v.id order by v.price_amount asc))[1] as variant_id,
      (array_agg(v.sku order by v.price_amount asc))[1] as sku,
      min(v.price_amount) as price_amount,
      max(v.compare_at_amount) as compare_at_amount,
      sum(v.inventory_quantity) as inventory_quantity,
      (array_agg(v.weight_grams order by v.price_amount asc))[1] as weight_grams,
      array_agg(distinct v.size) filter (where v.size is not null) as sizes,
      array_agg(distinct v.color) filter (where v.color is not null) as colors
    from medusastore.product_variants v
    where v.product_id = p.id and v.is_active = true
  ) variants on true
`;

function stockLabel(quantity: number | null) {
  if (!quantity || quantity <= 0) return "Out of stock";
  if (quantity <= 5) return "Low stock";
  return "In stock";
}

function mapRow(row: ProductRow): StoreProduct {
  const metadata = row.metadata ?? {};
  const priceAmount = row.price_amount ?? 0;
  const compareAtAmount = row.compare_at_amount ?? 0;
  const soldCount = row.sold_count ?? 0;
  const avgSoldCount = row.avg_sold_count ? Number(row.avg_sold_count) : 0;
  const createdAt = new Date(row.created_at).getTime();
  const isNewArrival = Date.now() - createdAt < 60 * 24 * 60 * 60 * 1000;

  return {
    id: row.id,
    variantId: row.variant_id ?? "",
    name: row.title,
    slug: row.slug,
    category: row.category_name ?? "General",
    subcategory: metadata.subcategory ?? "",
    collection: metadata.collection ?? "",
    image: row.images?.[0] ?? "/assets/products/placeholder.svg",
    images: row.images ?? [],
    price: priceAmount / 100,
    oldPrice: compareAtAmount > priceAmount ? compareAtAmount / 100 : 0,
    stock: stockLabel(row.inventory_quantity),
    rating: row.rating ? Number(row.rating).toFixed(1) : "0.0",
    orders: `${soldCount} sold`,
    badge: row.badge ?? "",
    description: row.description ?? "",
    highlights: metadata.highlights ?? [],
    delivery: metadata.delivery ?? "",
    warranty: metadata.warranty ?? "",
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    fit: metadata.fit ?? "Regular",
    fabric: metadata.fabric ?? "",
    gender: metadata.gender ?? "Unisex",
    occasion: metadata.occasion ?? [],
    brand: metadata.brand ?? "",
    sku: row.sku ?? "",
    discountEligible: row.is_flash_deal,
    weight: row.weight_grams ?? 0,
    status: row.status === "active" ? "Published" : row.status === "archived" ? "Archived" : "Draft",
    branchStock: metadata.branchStock ?? [],
    care: metadata.care ?? "",
    popularity: soldCount,
    isNewArrival,
    isBestSeller: soldCount > 0 && soldCount >= avgSoldCount,
    categoryId: row.category_id,
  };
}

export async function getActiveProducts(): Promise<StoreProduct[]> {
  const sql = getSql();
  const rows = (await sql.unsafe(`
    ${PRODUCT_SELECT}
    where p.status = 'active'
    order by p.created_at desc
  `)) as unknown as ProductRow[];

  return rows.map(mapRow);
}

export async function getProductBySlug(slug: string): Promise<StoreProduct | null> {
  const sql = getSql();
  const rows = (await sql.unsafe(
    `
    ${PRODUCT_SELECT}
    where p.status = 'active' and p.slug = $1
  `,
    [slug],
  )) as unknown as ProductRow[];

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getRelatedProducts(categoryId: string | null, excludeProductId: string, limit = 4): Promise<StoreProduct[]> {
  if (!categoryId) return [];
  const sql = getSql();
  const rows = (await sql.unsafe(
    `
    ${PRODUCT_SELECT}
    where p.status = 'active' and p.category_id = $1 and p.id <> $2
    order by p.created_at desc
    limit $3
  `,
    [categoryId, excludeProductId, limit],
  )) as unknown as ProductRow[];

  return rows.map(mapRow);
}

export async function getFlashDeals(limit = 8): Promise<StoreProduct[]> {
  const sql = getSql();
  const rows = (await sql.unsafe(
    `
    ${PRODUCT_SELECT}
    where p.status = 'active' and p.is_flash_deal = true
    order by p.created_at desc
    limit $1
  `,
    [limit],
  )) as unknown as ProductRow[];

  return rows.map(mapRow);
}

export async function getFeaturedProducts(limit = 8): Promise<StoreProduct[]> {
  const sql = getSql();
  const rows = (await sql.unsafe(
    `
    ${PRODUCT_SELECT}
    where p.status = 'active' and p.is_featured = true
    order by p.created_at desc
    limit $1
  `,
    [limit],
  )) as unknown as ProductRow[];

  return rows.map(mapRow);
}
