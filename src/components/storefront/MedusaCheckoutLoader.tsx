"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/medusa/cart/CartProvider";
import { CheckoutFlow } from "./CheckoutFlow";

export function MedusaCheckoutLoader({ isSignedIn, customer }: { isSignedIn: boolean; customer: { displayName: string; email: string; phone: string } | null }) {
  const { cart, isLoading } = useCart();
  // finalizeVerifiedCheckout clears the shared cart (resetAfterCheckout)
  // *before* redirecting to the confirmation page, not after - without this
  // guard, that split second of a genuinely empty cart looks identical to
  // "arrived at /checkout with nothing in it" and this component bounces the
  // just-completed order back to /cart, racing the real redirect. CheckoutFlow
  // sets this the moment it starts finalizing a payment, guest or signed in.
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false);
  if (isLoading) return <div className="ed-checkout-panel"><Loader2 className="spin" /> Loading your bag...</div>;
  if (!isCompletingCheckout && (!cart.id || !cart.items.length)) {
    if (typeof window !== "undefined") window.location.replace("/cart");
    return null;
  }
  return <CheckoutFlow cart={cart} isSignedIn={isSignedIn} customer={customer} medusa onCheckoutCompleting={setIsCompletingCheckout} />;
}
