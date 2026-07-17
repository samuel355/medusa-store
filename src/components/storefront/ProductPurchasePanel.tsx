"use client";

import { CheckCircle2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useState } from "react";
import { type StoreProduct } from "@/lib/db/products";
import { addToCart } from "@/lib/utils/cart";
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

  async function addItems() {
    setIsSubmitting(true);
    try {
      await addToCart(product.variantId, quantity);
      const variant = [size, color].filter(Boolean).join(" / ");
      setMessage(`${quantity} item(s) added${variant ? `: ${variant}` : "."}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function buyNow() {
    setIsSubmitting(true);
    try {
      await addToCart(product.variantId, quantity);
      window.location.href = "/cart";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="purchase-panel">
      <div>
        <span>Price</span>
        <strong>{formatMoney(product.price)}</strong>
      </div>
      {hasSizes ? (
        <label>
          Size
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            {product.sizes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      {hasColors ? (
        <label>
          Color
          <select value={color} onChange={(event) => setColor(event.target.value)}>
            {product.colors.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      ) : null}
      <div>
        <span>Availability</span>
        <strong>{product.stock}</strong>
      </div>
      <div className="quantity-stepper">
        <button aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
          <Minus size={16} />
        </button>
        <strong>{quantity}</strong>
        <button aria-label="Increase quantity" onClick={() => setQuantity((current) => current + 1)}>
          <Plus size={16} />
        </button>
      </div>
      <div className="purchase-actions">
        <button className="secondary-action" disabled={isSubmitting} onClick={addItems}>
          <ShoppingBag size={18} />
          Add to cart
        </button>
        <button className="pay-button" disabled={isSubmitting} onClick={buyNow}>
          <Zap size={18} />
          Buy now
        </button>
      </div>
      {hasSizes || hasColors ? (
        <small className="purchase-selection">
          Selected: {[size, color].filter(Boolean).join(" / ")}
        </small>
      ) : null}
      {message ? (
        <p className="inline-notice purchase-notice">
          <CheckCircle2 size={16} />
          {message} <a href="/cart">View cart</a>
        </p>
      ) : null}
    </div>
  );
}
