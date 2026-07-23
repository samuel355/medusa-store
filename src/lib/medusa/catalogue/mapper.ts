import type { CatalogueCategory, CatalogueProduct } from "./types";
import type { BranchStock, StoreCategory, StoreProduct } from "./contracts";
import { MedusaCatalogueContractError } from "./errors";

type Metadata = Record<string, unknown>;

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MedusaCatalogueContractError(field, value);
  }
  return value;
}

function metadataOf(value: unknown): Metadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Metadata)
    : {};
}

function stringValue(metadata: Metadata, key: string) {
  return typeof metadata[key] === "string" ? metadata[key] : "";
}

function stringList(metadata: Metadata, key: string) {
  const value = metadata[key];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function numberValue(metadata: Metadata, key: string) {
  return typeof metadata[key] === "number" && Number.isFinite(metadata[key])
    ? metadata[key]
    : 0;
}

function booleanValue(metadata: Metadata, key: string) {
  return metadata[key] === true;
}

function branchStock(metadata: Metadata): BranchStock[] {
  const value = metadata.branchStock ?? metadata.branch_stock;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BranchStock => {
    if (!item || typeof item !== "object") return false;
    const stock = item as Partial<BranchStock>;
    return typeof stock.location === "string" && typeof stock.quantity === "number" && typeof stock.lowStockThreshold === "number";
  });
}

function optionValues(product: CatalogueProduct, key: "size" | "color") {
  const values = product.variants?.map((variant) => {
    const metadata = metadataOf(variant.metadata);
    return typeof metadata[key] === "string" ? metadata[key] : "";
  }).filter(Boolean) ?? [];
  return Array.from(new Set(values));
}

function inventoryQuantity(product: CatalogueProduct) {
  const variants = product.variants ?? [];
  if (variants.some((variant) => variant.manage_inventory === false)) return Number.POSITIVE_INFINITY;
  return variants.reduce((total, variant) => total + (variant.inventory_quantity ?? 0), 0);
}

function stockLabel(quantity: number) {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= 5) return "Low stock";
  return "In stock";
}

function calculatedAmount(product: CatalogueProduct, variantIndex: number, field: "calculated_amount" | "original_amount") {
  const price = product.variants?.[variantIndex]?.calculated_price;
  const value = price?.[field];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function selectCategories(productId: string, categories: CatalogueProduct["categories"], metadata: Metadata) {
  const available = categories ?? [];
  const categoryId = stringValue(metadata, "storefront_category_id");
  const categoryHandle = stringValue(metadata, "storefront_category_handle");
  const explicit = categoryId
    ? available.find((category) => category.id === categoryId)
    : categoryHandle
      ? available.find((category) => category.handle === categoryHandle)
      : undefined;

  if ((categoryId || categoryHandle) && !explicit) {
    throw new MedusaCatalogueContractError(
      `product(${productId}).metadata.storefront_category`,
      categoryId || categoryHandle,
    );
  }

  const gender = stringValue(metadata, "gender");
  const genderCategory = gender
    ? available.find((category) => category.name.toLowerCase() === gender.toLowerCase())
    : undefined;
  const ordered = [...available].sort((left, right) => {
    const leftRoot = left.parent_category_id == null ? 0 : 1;
    const rightRoot = right.parent_category_id == null ? 0 : 1;
    return leftRoot - rightRoot || (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) || left.handle.localeCompare(right.handle);
  });
  const category = explicit ?? genderCategory ?? ordered[0];
  const requestedSubcategory = stringValue(metadata, "subcategory");
  const subcategory = requestedSubcategory
    ? available.find((item) => item.name === requestedSubcategory)
    : ordered.find((item) => item.id !== category?.id);

  return { category, subcategory };
}

export function mapMedusaProduct(product: CatalogueProduct): StoreProduct {
  const id = requiredString(product.id, "product.id");
  const name = requiredString(product.title, `product(${id}).title`);
  const slug = requiredString(product.handle, `product(${id}).handle`);
  const variants = product.variants ?? [];
  if (!variants.length) throw new MedusaCatalogueContractError(`product(${id}).variants`, product.variants);

  const priced = variants.map((variant, index) => ({ variant, index, amount: calculatedAmount(product, index, "calculated_amount") }));
  priced.sort((left, right) => left.amount - right.amount);
  const selected = priced[0];
  const variantId = requiredString(selected.variant.id, `product(${id}).variants[0].id`);
  const metadata = metadataOf(product.metadata);
  const { category, subcategory } = selectCategories(id, product.categories, metadata);
  const images = (product.images ?? []).map((image) => image.url).filter((url): url is string => typeof url === "string" && Boolean(url));
  const thumbnail = typeof product.thumbnail === "string" ? product.thumbnail : "";
  if (!images.length && thumbnail) images.push(thumbnail);
  const price = selected.amount;
  const originalAmount = calculatedAmount(product, selected.index, "original_amount");
  const soldCount = numberValue(metadata, "sold_count");
  const createdAt = product.created_at ? new Date(product.created_at).getTime() : Number.NaN;

  return {
    id,
    variantId,
    name,
    slug,
    category: category?.name ?? "General",
    subcategory: subcategory?.name ?? stringValue(metadata, "subcategory"),
    collection: product.collection?.title ?? stringValue(metadata, "collection"),
    image: images[0] ?? "/assets/products/placeholder.svg",
    images,
    price,
    oldPrice: originalAmount > price ? originalAmount : 0,
    stock: stockLabel(inventoryQuantity(product)),
    rating: numberValue(metadata, "rating").toFixed(1),
    orders: `${soldCount} sold`,
    badge: stringValue(metadata, "badge"),
    description: product.description ?? "",
    highlights: stringList(metadata, "highlights"),
    delivery: stringValue(metadata, "delivery"),
    warranty: stringValue(metadata, "warranty"),
    sizes: optionValues(product, "size"),
    colors: optionValues(product, "color"),
    fit: (["Slim", "Regular", "Oversized", "Tailored"] as const).includes(metadata.fit as never) ? metadata.fit as StoreProduct["fit"] : "Regular",
    fabric: stringValue(metadata, "fabric"),
    gender: (["Men", "Women", "Unisex"] as const).includes(metadata.gender as never) ? metadata.gender as StoreProduct["gender"] : "Unisex",
    occasion: stringList(metadata, "occasion"),
    brand: stringValue(metadata, "brand"),
    sku: selected.variant.sku ?? "",
    discountEligible: booleanValue(metadata, "discount_eligible") || booleanValue(metadata, "discountEligible"),
    weight: product.weight ?? selected.variant.weight ?? 0,
    status: product.status === "published" ? "Published" : product.status === "rejected" ? "Archived" : "Draft",
    branchStock: branchStock(metadata),
    care: stringValue(metadata, "care"),
    popularity: soldCount,
    isNewArrival: Number.isFinite(createdAt) && Date.now() - createdAt < 60 * 24 * 60 * 60 * 1000,
    isBestSeller: booleanValue(metadata, "is_best_seller"),
    categoryId: category?.id ?? null,
  };
}

export function mapMedusaCategory(category: CatalogueCategory): StoreCategory {
  const id = requiredString(category.id, "category.id");
  const metadata = metadataOf(category.metadata);
  return {
    id,
    name: requiredString(category.name, `category(${id}).name`),
    slug: requiredString(category.handle, `category(${id}).handle`),
    description: category.description ?? "",
    imageUrl: stringValue(metadata, "image_url") || stringValue(metadata, "imageUrl"),
  };
}
