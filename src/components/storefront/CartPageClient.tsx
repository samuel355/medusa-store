"use client";

import { ArrowRight, Headset, Lock, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import Image from "next/image";
import type { CartItem } from "@/lib/utils/cart";
import { useCart } from "@/lib/medusa/cart";
import { formatMoney } from "@/lib/utils/money";

export function CartPageClient() {
  const { cart: response, isLoading, isMutating, error, removeCartItem, updateCartItemQuantity } = useCart();
  const cart = response.items;
  const totals = response.totals;

  async function updateQuantity(item: CartItem, quantity: number) {
    try {
      await updateCartItemQuantity(item.id, quantity);
    } catch {
      // The shared provider exposes the mutation error in the visible alert.
    }
  }

  async function removeItem(item: CartItem) {
    try {
      await removeCartItem(item.id);
    } catch {
      // The shared provider exposes the mutation error in the visible alert.
    }
  }

  if (isLoading) {
    return <section className="ed-empty"><p>Loading your bag…</p></section>;
  }

  if (error && !cart.length) {
    return <section className="ed-empty"><h2>We couldn&apos;t load your bag.</h2><p>{error.message}</p></section>;
  }

  if (!cart.length) {
    return (
      <section className="ed-empty">
        <ShoppingBag size={28} />
        <h2>Your bag is empty.</h2>
        <p>Add products from the shop, then return here to checkout.</p>
        <a className="ed-text-link" href="/shop">
          Continue shopping
          <ArrowRight size={16} />
        </a>
      </section>
    );
  }

  return (
    <div className="ed-bag-grid">
      <div className="ed-bag-items">
        {error ? <p className="ed-notice" role="alert">{error.message}</p> : null}
        {cart.map((item) => (
          <article className="ed-bag-row" key={item.id}>
            <span className="ed-bag-image">
              <Image src={item.image} alt={item.name} fill sizes="120px" />
            </span>
            <div className="ed-bag-body">
              <div className="ed-bag-top">
                <a href={`/products/${item.slug}`}>
                  <strong>{item.name}</strong>
                  {(item.size || item.color) ? (
                    <span className="ed-bag-meta">
                      {item.color ? <>Color: {item.color}</> : null}
                      {item.size && item.color ? " · " : null}
                      {item.size ? <>Size: {item.size}</> : null}
                    </span>
                  ) : null}
                </a>
                <button
                  className="ed-bag-remove"
                  disabled={isMutating}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="ed-bag-bottom">
                <div className="ed-qty-stepper">
                  <button disabled={isMutating} aria-label="Decrease quantity" onClick={() => updateQuantity(item, item.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <strong>{item.quantity}</strong>
                  <button disabled={isMutating} aria-label="Increase quantity" onClick={() => updateQuantity(item, item.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className="ed-bag-price-group">
                  {item.quantity > 1 ? <span className="ed-bag-unit-price">{formatMoney(item.price)} each</span> : null}
                  <span className="ed-bag-price">{formatMoney(item.lineTotal)}</span>
                </div>
              </div>
            </div>
          </article>
        ))}

        <p className="ed-bag-policy">
          Items can be returned or exchanged within 14 days of delivery, in original condition. Reach out any time —
          support details are in the footer below.
        </p>
      </div>

      <aside className="ed-bag-summary">
        <h2>Order summary</h2>
        <div className="ed-bag-summary-lines">
          <div>
            <span>Subtotal ({totals.quantity} item{totals.quantity === 1 ? "" : "s"})</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </div>
          <div>
            <span>Estimated delivery</span>
            <span>{formatMoney(totals.shipping)}</span>
          </div>
          <div className="ed-bag-summary-total">
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <a className="ed-btn-solid ed-bag-checkout" href="/checkout">
          Checkout
          <ArrowRight size={17} />
        </a>
        <p className="ed-bag-secure">
          <Lock size={14} />
          Secure checkout powered by Paystack
        </p>

        <div className="ed-bag-trust">
          <span>
            <Truck size={16} />
            Same-day Accra
          </span>
          <span>
            <ShieldCheck size={16} />
            Secure payment
          </span>
          <span>
            <Headset size={16} />
            24/7 support
          </span>
        </div>
      </aside>
    </div>
  );
}
