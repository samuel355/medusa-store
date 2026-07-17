"use client";

import { ArrowRight, CreditCard, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CART_UPDATED_EVENT,
  type CartItem,
  fetchCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/utils/cart";
import { formatMoney } from "@/lib/utils/money";

const EMPTY_TOTALS = { quantity: 0, subtotal: 0, shipping: 0, total: 0 };

export function CartPageClient() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function syncCart() {
      fetchCart().then((response) => {
        setCart(response.items);
        setTotals(response.totals);
        setIsLoading(false);
      });
    }

    syncCart();
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    return () => window.removeEventListener(CART_UPDATED_EVENT, syncCart);
  }, []);

  async function updateQuantity(item: CartItem, quantity: number) {
    const response = await updateCartItemQuantity(item.id, quantity);
    setCart(response.items);
    setTotals(response.totals);
  }

  async function removeItem(item: CartItem) {
    const response = await removeCartItem(item.id);
    setCart(response.items);
    setTotals(response.totals);
  }

  if (isLoading) {
    return null;
  }

  if (!cart.length) {
    return (
      <section className="dashboard-panel cart-empty">
        <ShoppingBag size={34} />
        <h2>Your cart is empty.</h2>
        <p>Add products from the shop, then return here to checkout.</p>
        <a className="primary-action" href="/shop">
          Continue shopping
        </a>
      </section>
    );
  }

  return (
    <section className="cart-layout">
      <div className="cart-items">
        {cart.map((item) => (
          <article className="cart-row" key={item.id}>
            <a className="cart-row-image" href={`/products/${item.slug}`}>
              <img src={item.image} alt={item.name} />
            </a>
            <div>
              <a href={`/products/${item.slug}`}>
                <strong>{item.name}</strong>
              </a>
              <span>{formatMoney(item.price)} each</span>
              {(item.size || item.color) ? (
                <small className="cart-variant-label">
                  {[item.size, item.color].filter(Boolean).join(" / ")}
                </small>
              ) : null}
            </div>
            <div className="quantity-stepper">
              <button aria-label="Decrease quantity" onClick={() => updateQuantity(item, item.quantity - 1)}>
                <Minus size={16} />
              </button>
              <strong>{item.quantity}</strong>
              <button aria-label="Increase quantity" onClick={() => updateQuantity(item, item.quantity + 1)}>
                <Plus size={16} />
              </button>
            </div>
            <strong>{formatMoney(item.lineTotal)}</strong>
            <button className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item)}>
              <Trash2 size={17} />
            </button>
          </article>
        ))}
      </div>

      <aside className="checkout-panel cart-summary">
        <div className="checkout-head">
          <div>
            <p className="kicker">Cart summary</p>
            <h2>Ready to checkout</h2>
            <span>Mobile Money first. Card ready too.</span>
          </div>
        </div>
        <div className="cart-payment-card">
          <CreditCard size={18} />
          <div>
            <strong>Mobile Money</strong>
            <span>Fast local payment with order confirmation.</span>
          </div>
        </div>
        <div className="checkout-lines">
          <div>
            <span>Items</span>
            <strong>{totals.quantity}</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(totals.subtotal)}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>{formatMoney(totals.shipping)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatMoney(totals.total)}</strong>
          </div>
        </div>
        <a className="pay-button" href="/checkout">
          Proceed to checkout
          <ArrowRight size={18} />
        </a>
        <div className="checkout-trust cart-checkout-trust">
          <span>
            <ShieldCheck size={16} />
            Secure payment
          </span>
          <span>
            <Truck size={16} />
            Delivery updates
          </span>
          <span>
            <PackageCheck size={16} />
            Easy exchange
          </span>
        </div>
      </aside>
    </section>
  );
}
