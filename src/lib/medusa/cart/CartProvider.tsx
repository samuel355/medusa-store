"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartResponse } from "@/lib/utils/cart";
import {
  addToCart as legacyAdd,
  fetchCart as legacyFetch,
  removeCartItem as legacyRemove,
  updateCartItemQuantity as legacyUpdate,
} from "@/lib/utils/cart";
import { medusaConfig, medusaSdk } from "@/lib/medusa/sdk";
import { isMedusaCartEnabled } from "./config";
import { createCartController, type CartController, type CartDataSource } from "./controller";
import { createMedusaCartDataSource } from "./data-source";
import { createCartService } from "./service";

type CartContextValue = {
  cart: CartResponse;
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
  addToCart(variantId: string, quantity?: number): Promise<CartResponse>;
  updateCartItemQuantity(itemId: string, quantity: number): Promise<CartResponse>;
  removeCartItem(itemId: string): Promise<CartResponse>;
  resetAfterCheckout(): Promise<CartResponse>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function createLegacyCartDataSource(): CartDataSource {
  return { initialize: legacyFetch, add: legacyAdd, update: legacyUpdate, remove: legacyRemove };
}

export function CartProvider({ children, controller: injectedController }: Readonly<{ children: React.ReactNode; controller?: CartController }>) {
  const controller = useMemo(() => injectedController ?? createCartController(
    isMedusaCartEnabled() ? createMedusaCartDataSource({
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    }, createCartService(medusaSdk.store.cart, medusaConfig.regionId)) : createLegacyCartDataSource(),
  ), [injectedController]);
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    controller.initialize().catch(() => { /* state exposes the typed failure */ });
    return () => { unsubscribe(); };
  }, [controller]);

  const value = useMemo<CartContextValue>(() => ({
    ...state,
    addToCart: controller.add,
    updateCartItemQuantity: controller.update,
    removeCartItem: controller.remove,
    resetAfterCheckout: controller.reset,
  }), [controller, state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
