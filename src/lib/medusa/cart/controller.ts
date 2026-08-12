import type { CartResponse } from "@/lib/utils/cart";

export type MergeItem = { variantId: string; quantity: number };

export type CartDataSource = {
  initialize(): Promise<CartResponse>;
  add(variantId: string, quantity: number): Promise<CartResponse>;
  update(itemId: string, quantity: number): Promise<CartResponse>;
  remove(itemId: string): Promise<CartResponse>;
  reset?(): Promise<CartResponse>;
  // Switches this device to a customer's cart recovered from another device
  // (or from an earlier session), merging in any items already present in
  // this device's own cart first so neither side's additions are lost.
  adoptCart?(targetCartId: string, mergeItems: MergeItem[]): Promise<CartResponse>;
  applyDiscount?(code: string): Promise<CartResponse>;
  removeDiscount?(code: string): Promise<CartResponse>;
};

export type CartControllerState = {
  cart: CartResponse;
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
};

const EMPTY_CART: CartResponse = { id: null, items: [], totals: { quantity: 0, subtotal: 0, shipping: 0, discount: 0, total: 0 }, promoCodes: [] };

export function createCartController(source: CartDataSource) {
  let state: CartControllerState = { cart: EMPTY_CART, isLoading: true, isMutating: false, error: null };
  let initialization: Promise<CartResponse> | null = null;
  const listeners = new Set<(state: CartControllerState) => void>();
  const publish = (patch: Partial<CartControllerState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  };
  const accept = (cart: CartResponse) => {
    publish({ cart });
    return cart;
  };

  async function initialize() {
    if (initialization) return initialization;
    initialization = source.initialize()
      .then((cart) => accept(cart))
      .catch((cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        publish({ error });
        throw error;
      })
      .finally(() => publish({ isLoading: false }));
    return initialization;
  }

  async function mutate(action: () => Promise<CartResponse>) {
    publish({ isMutating: true, error: null });
    try {
      // A mutation can be triggered (e.g. a fast click right after page load)
      // before the initial cart lookup/creation has resolved. Waiting for it
      // here guarantees the data source has a cart ID before it mutates,
      // instead of racing and failing with "cart is not initialized".
      await initialize();
      return accept(await action());
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      publish({ error });
      throw error;
    } finally {
      publish({ isMutating: false });
    }
  }

  return {
    getState: () => state,
    subscribe(listener: (state: CartControllerState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    add: (variantId: string, quantity = 1) => mutate(() => source.add(variantId, quantity)),
    update: (itemId: string, quantity: number) => mutate(() => quantity <= 0 ? source.remove(itemId) : source.update(itemId, quantity)),
    remove: (itemId: string) => mutate(() => source.remove(itemId)),
    reset: () => mutate(() => source.reset ? source.reset() : source.initialize()),
    adoptCart: (targetCartId: string, mergeItems: MergeItem[]) =>
      source.adoptCart ? mutate(() => source.adoptCart!(targetCartId, mergeItems)) : Promise.resolve(state.cart),
    applyDiscountCode: (code: string) =>
      source.applyDiscount ? mutate(() => source.applyDiscount!(code)) : Promise.reject(new Error("Discount codes aren't available right now.")),
    removeDiscountCode: (code: string) =>
      source.removeDiscount ? mutate(() => source.removeDiscount!(code)) : Promise.resolve(state.cart),
  };
}

export type CartController = ReturnType<typeof createCartController>;
