"use client";

import { Loader2 } from "lucide-react";
import { useCart } from "@/lib/medusa/cart/CartProvider";
import { CheckoutFlow } from "./CheckoutFlow";

export function MedusaCheckoutLoader({ isSignedIn, customer }: { isSignedIn: boolean; customer: { displayName: string; email: string; phone: string } | null }) {
  const { cart, isLoading } = useCart();
  if (isLoading) return <div className="checkout-panel"><Loader2 className="spin" /> Loading your bag...</div>;
  if (!cart.id || !cart.items.length) {
    if (typeof window !== "undefined") window.location.replace("/cart");
    return null;
  }
  return <CheckoutFlow cart={cart} isSignedIn={isSignedIn} customer={customer} medusa />;
}
