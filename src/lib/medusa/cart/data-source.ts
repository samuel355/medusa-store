import type { CartResponse } from "@/lib/utils/cart";
import type { CartDataSource } from "./controller";

const CART_ID_KEY = "begnon_medusa_cart_id";

export type MedusaCartService = {
  create(): Promise<CartResponse>;
  retrieve(id: string): Promise<CartResponse>;
  add(id: string, variantId: string, quantity: number): Promise<CartResponse>;
  update(id: string, itemId: string, quantity: number): Promise<CartResponse>;
  remove(id: string, itemId: string): Promise<CartResponse>;
};

export function createMedusaCartDataSource(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  service: MedusaCartService,
): CartDataSource {
  let cartId: string | null = null;
  const accept = (cart: CartResponse) => {
    if (!cart.id) throw new Error("Medusa did not return a cart ID");
    cartId = cart.id;
    storage.setItem(CART_ID_KEY, cart.id);
    return cart;
  };
  const requireId = () => {
    if (!cartId) throw new Error("Medusa cart is not initialized");
    return cartId;
  };
  return {
    initialize: async () => {
      cartId = storage.getItem(CART_ID_KEY);
      return accept(cartId ? await service.retrieve(cartId) : await service.create());
    },
    add: async (variantId, quantity) => accept(await service.add(requireId(), variantId, quantity)),
    update: async (itemId, quantity) => accept(await service.update(requireId(), itemId, quantity)),
    remove: async (itemId) => accept(await service.remove(requireId(), itemId)),
    reset: async () => {
      cartId = null;
      storage.removeItem(CART_ID_KEY);
      return accept(await service.create());
    },
  };
}
