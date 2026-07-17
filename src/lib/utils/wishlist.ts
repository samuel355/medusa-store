export type WishlistItem = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  category: string;
};

export const WISHLIST_UPDATED_EVENT = "sobalshop:wishlist-updated";

export async function fetchWishlist(): Promise<WishlistItem[]> {
  try {
    const response = await fetch("/api/wishlist", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { items: WishlistItem[] };
    return data.items;
  } catch {
    return [];
  }
}

export async function toggleWishlistItem(productId: string): Promise<{ inWishlist: boolean; requiresAuth?: boolean }> {
  try {
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (response.status === 401) return { inWishlist: false, requiresAuth: true };
    if (!response.ok) return { inWishlist: false };

    const result = (await response.json()) as { inWishlist: boolean };
    window.dispatchEvent(new CustomEvent(WISHLIST_UPDATED_EVENT));
    return result;
  } catch {
    return { inWishlist: false };
  }
}
