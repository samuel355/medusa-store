import type { CartResponse } from "@/lib/utils/cart";
import type { CartDataSource, MergeItem } from "./controller";
import { MedusaCartOperationError } from "./errors";

const CART_ID_KEY = "begnon_medusa_cart_id";

export type MedusaCartService = {
  create(): Promise<CartResponse>;
  retrieve(id: string): Promise<CartResponse>;
  add(id: string, variantId: string, quantity: number): Promise<CartResponse>;
  update(id: string, itemId: string, quantity: number): Promise<CartResponse>;
  remove(id: string, itemId: string): Promise<CartResponse>;
  applyDiscount(id: string, code: string): Promise<CartResponse>;
  removeDiscount(id: string, code: string): Promise<CartResponse>;
};

// A cart left with a captured-but-uncancellable payment session 500s on every
// edit; Medusa's error has no code for this, so detection is message-based.
function isStalePaymentSessionError(error: unknown): boolean {
  if (!(error instanceof MedusaCartOperationError)) return false;
  const cause = error.cause;
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  return /payment session/i.test(message);
}

// A stored cart ID can outlive the cart itself; treat a 404 on retrieve like
// a fresh visitor instead of a hard error.
function isCartNotFoundError(error: unknown): boolean {
  if (!(error instanceof MedusaCartOperationError) || error.operation !== "retrieve") return false;
  const cause = error.cause as { status?: number } | undefined;
  return cause?.status === 404;
}

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
  const abandonForFreshCart = async () => {
    cartId = null;
    storage.removeItem(CART_ID_KEY);
    return accept(await service.create());
  };
  return {
    initialize: async () => {
      cartId = storage.getItem(CART_ID_KEY);
      if (!cartId) return accept(await service.create());
      try {
        return accept(await service.retrieve(cartId));
      } catch (error) {
        if (!isCartNotFoundError(error)) throw error;
        return accept(await service.create());
      }
    },
    add: async (variantId, quantity) => {
      try {
        return accept(await service.add(requireId(), variantId, quantity));
      } catch (error) {
        if (!isStalePaymentSessionError(error)) throw error;
        await abandonForFreshCart();
        return accept(await service.add(requireId(), variantId, quantity));
      }
    },
    update: async (itemId, quantity) => {
      try {
        return accept(await service.update(requireId(), itemId, quantity));
      } catch (error) {
        if (!isStalePaymentSessionError(error)) throw error;
        return abandonForFreshCart();
      }
    },
    remove: async (itemId) => {
      try {
        return accept(await service.remove(requireId(), itemId));
      } catch (error) {
        if (!isStalePaymentSessionError(error)) throw error;
        return abandonForFreshCart();
      }
    },
    reset: abandonForFreshCart,
    adoptCart: async (targetCartId: string, mergeItems: MergeItem[]) => {
      // Sequential, not parallel: line-item creation isn't safe to race
      // against itself on the same cart (each call reads-then-writes the
      // cart's item list).
      for (const item of mergeItems) {
        await service.add(targetCartId, item.variantId, item.quantity);
      }
      return accept(await service.retrieve(targetCartId));
    },
    applyDiscount: async (code: string) => accept(await service.applyDiscount(requireId(), code)),
    removeDiscount: async (code: string) => accept(await service.removeDiscount(requireId(), code)),
  };
}
