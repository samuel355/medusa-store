export type CartItem = {
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

export type CartTotals = {
  quantity: number;
  subtotal: number;
  shipping: number;
  total: number;
};

export type CartResponse = {
  id: string | null;
  items: CartItem[];
  totals: CartTotals;
};

export const CART_UPDATED_EVENT = "begnon:cart-updated";

const EMPTY_CART: CartResponse = { id: null, items: [], totals: { quantity: 0, subtotal: 0, shipping: 0, total: 0 } };
let activeCartRequest: Promise<CartResponse> | null = null;

export async function fetchCart(): Promise<CartResponse> {
  if (activeCartRequest) return activeCartRequest;

  activeCartRequest = fetch("/api/cart", { cache: "no-store" })
    .then(async (response) => response.ok ? (await response.json()) as CartResponse : EMPTY_CART)
    .catch(() => EMPTY_CART)
    .finally(() => {
      activeCartRequest = null;
    });

  return activeCartRequest;
}

function notifyCartUpdated() {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export async function addToCart(variantId: string, quantity = 1): Promise<CartResponse> {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, quantity }),
  });
  const cart = response.ok ? ((await response.json()) as CartResponse) : EMPTY_CART;
  notifyCartUpdated();
  return cart;
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartResponse> {
  const response = await fetch("/api/cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, quantity }),
  });
  const cart = response.ok ? ((await response.json()) as CartResponse) : EMPTY_CART;
  notifyCartUpdated();
  return cart;
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const response = await fetch("/api/cart", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId }),
  });
  const cart = response.ok ? ((await response.json()) as CartResponse) : EMPTY_CART;
  notifyCartUpdated();
  return cart;
}
