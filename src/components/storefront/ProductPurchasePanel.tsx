"use client";

import { CheckCircle2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useState } from "react";
import { type StoreProduct } from "@/lib/db/products";
import { useCart } from "@/lib/medusa/cart";
import { formatMoney } from "@/lib/utils/money";

export function ProductPurchasePanel({
  product,
}: Readonly<{
  product: StoreProduct;
}>) {
  const hasSizes = product.sizes.length > 0;
  const hasColors = product.colors.length > 0;
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToCart, error: cartError } = useCart();

  async function addItems() {
    setIsSubmitting(true);
    try {
      await addToCart(product.variantId, quantity);
      const variant = [size, color].filter(Boolean).join(" / ");
      setMessage(`${quantity} item(s) added${variant ? `: ${variant}` : "."}`);
    } catch {
      // The shared provider exposes the mutation error in the visible alert.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function buyNow() {
    setIsSubmitting(true);
    try {
      await addToCart(product.variantId, quantity);
      window.location.href = "/cart";
    } catch {
      // The shared provider exposes the mutation error in the visible alert.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ed-buybox">
      <span className="ed-buybox-availability">{product.stock}</span>
      {hasSizes ? (
        <label className="ed-buybox-field">
          <span>Size</span>
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            {product.sizes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      {hasColors ? (
        <label className="ed-buybox-field">
          <span>Color</span>
          <select value={color} onChange={(event) => setColor(event.target.value)}>
            {product.colors.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="ed-qty-stepper">
        <button aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
          <Minus size={15} />
        </button>
        <strong>{quantity}</strong>
        <button aria-label="Increase quantity" onClick={() => setQuantity((current) => current + 1)}>
          <Plus size={15} />
        </button>
      </div>
      <div className="ed-buybox-actions">
        <button className="ed-btn-outline" disabled={isSubmitting} onClick={addItems}>
          <ShoppingBag size={16} />
          Add to bag
        </button>
        <button className="ed-btn-solid" disabled={isSubmitting} onClick={buyNow}>
          <Zap size={16} />
          Buy now
        </button>
      </div>
      {message ? (
        <p className="ed-buybox-notice">
          <CheckCircle2 size={15} />
          {message} <a href="/cart">View cart</a>
        </p>
      ) : null}
      {cartError ? <p className="ed-buybox-notice" role="alert">{cartError.message}</p> : null}
    </div>
  );
}
