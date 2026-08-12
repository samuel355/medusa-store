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
  applyDiscountCode(code: string): Promise<CartResponse>;
  removeDiscountCode(code: string): Promise<CartResponse>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function createLegacyCartDataSource(): CartDataSource {
  return { initialize: legacyFetch, add: legacyAdd, update: legacyUpdate, remove: legacyRemove };
}

export function CartProvider({
  children,
  isSignedIn = false,
  controller: injectedController,
}: Readonly<{ children: React.ReactNode; isSignedIn?: boolean; controller?: CartController }>) {
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

  // Runs once per mount, right after the local (device) cart finishes its
  // first load, and only while signed in - reconciles this device's cart
  // with whatever the customer's account already knows about, so a second
  // device (or a fresh sign-in after guest browsing) recovers items instead
  // of starting from an empty cart. Best-effort throughout: any failure just
  // leaves this device on its own local cart, same as before this existed.
  useEffect(() => {
    if (!isSignedIn || state.isLoading) return;
    let cancelled = false;

    (async () => {
      const response = await fetch("/api/medusa/recover-cart", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) return;
      const { cartId: remoteCartId } = (await response.json()) as { cartId: string | null };
      if (cancelled) return;

      if (remoteCartId && remoteCartId !== state.cart.id) {
        const mergeItems = state.cart.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity }));
        await controller.adoptCart(remoteCartId, mergeItems).catch(() => {});
        return;
      }

      if (!remoteCartId && state.cart.id && state.cart.items.length > 0) {
        await fetch("/api/medusa/attach-cart-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId: state.cart.id }),
        }).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately excludes state.cart - it only needs the cart as it stood
    // the moment the local load finished, not a re-run on every mutation
    // this same sync can itself cause (adoptCart, attach-cart-customer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, state.isLoading, controller]);

  const value = useMemo<CartContextValue>(() => ({
    ...state,
    addToCart: controller.add,
    updateCartItemQuantity: controller.update,
    removeCartItem: controller.remove,
    resetAfterCheckout: controller.reset,
    applyDiscountCode: controller.applyDiscountCode,
    removeDiscountCode: controller.removeDiscountCode,
  }), [controller, state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
