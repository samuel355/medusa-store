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

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
};
