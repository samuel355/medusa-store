import type { CartResponse } from "@/lib/utils/cart";
import type { CartDataSource } from "./controller";
import { MedusaCartOperationError } from "./errors";

const CART_ID_KEY = "begnon_medusa_cart_id";

export type MedusaCartService = {
  create(): Promise<CartResponse>;
  retrieve(id: string): Promise<CartResponse>;
  add(id: string, variantId: string, quantity: number): Promise<CartResponse>;
  update(id: string, itemId: string, quantity: number): Promise<CartResponse>;
  remove(id: string, itemId: string): Promise<CartResponse>;
};

// If checkout fails after Paystack has already captured payment but before the
// order finishes creating (a real risk when the backend is slow — see
// finalizeVerifiedCheckout's retry loop), the cart is left with a captured
// payment session Medusa can never delete. Every subsequent edit to that cart
// then 500s ("Could not delete all payment sessions") — the shopper is
// permanently stuck until they clear storage by hand. This is Medusa's own
// FetchError message text, not ours, so detection has to be a message check.
function isStalePaymentSessionError(error: unknown): boolean {
  if (!(error instanceof MedusaCartOperationError)) return false;
  const cause = error.cause;
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  return /payment session/i.test(message);
}

// The cart ID persisted in storage can outlive the cart itself (deleted,
// expired, or from a reset dev database), in which case Medusa 404s on
// retrieve. Treat that the same as a fresh visitor rather than surfacing a
// permanent "cart operation failed" error.
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
        // A fresh cart has no prior items to conflict with, so re-adding the
        // same variant against it recovers transparently.
        await abandonForFreshCart();
        return accept(await service.add(requireId(), variantId, quantity));
      }
    },
    update: async (itemId, quantity) => {
      try {
        return accept(await service.update(requireId(), itemId, quantity));
      } catch (error) {
        if (!isStalePaymentSessionError(error)) throw error;
        // The line item being updated belonged to the poisoned cart, so it
        // has no equivalent in a fresh one — there's nothing sensible to
        // retry, just stop pointing at the cart that can never be edited.
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
  };
}
