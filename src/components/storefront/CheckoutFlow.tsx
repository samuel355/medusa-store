"use client";

import { CheckCircle2, CreditCard, LogIn, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { type CartResponse } from "@/lib/utils/cart";
import { medusaSdk } from "@/lib/medusa/sdk";
import { createCheckoutService, finalizeVerifiedCheckout } from "@/lib/medusa/checkout";
import { useCart } from "@/lib/medusa/cart/CartProvider";
import { formatMoney } from "@/lib/utils/money";
import { isValidEmail, isValidGhanaPhone } from "@/lib/utils/validation";
import { PaymentStatusModal } from "@/components/storefront/PaymentStatusModal";
import type { GhanaMobileMoneyProvider } from "@/lib/integrations/paystack";

type CheckoutFlowProps = {
  cart: CartResponse;
  isSignedIn: boolean;
  customer: { displayName: string; email: string; phone: string } | null;
  medusa?: boolean;
};

const NETWORKS: { value: GhanaMobileMoneyProvider; label: string }[] = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "vod", label: "Telecel Cash" },
  { value: "atl", label: "AirtelTigo Money" },
];

type ChargeState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "awaiting_otp"; reference: string; orderNumber: string; message: string }
  | { status: "awaiting_approval"; reference: string; orderNumber: string; message: string }
  | { status: "success"; orderNumber: string }
  | { status: "error"; message: string };

export function CheckoutFlow({ cart, isSignedIn, customer, medusa = false }: CheckoutFlowProps) {
  const [guestChosen, setGuestChosen] = useState(false);
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [momoProvider, setMomoProvider] = useState<GhanaMobileMoneyProvider>("mtn");
  const [momoPhone, setMomoPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [charge, setCharge] = useState<ChargeState>({ status: "idle" });
  const [touched, setTouched] = useState<Record<"email" | "phone" | "address" | "momoPhone", boolean>>({
    email: false,
    phone: false,
    address: false,
    momoPhone: false,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completingRef = useRef(false);
  const { resetAfterCheckout } = useCart();

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const phoneValid = useMemo(() => isValidGhanaPhone(phone), [phone]);
  const momoPhoneValid = useMemo(() => isValidGhanaPhone(momoPhone), [momoPhone]);
  const addressValid = address.trim().length > 4;

  function markTouched(field: keyof typeof touched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Warm the Paystack popup bundle as soon as the payment step is reachable, so
  // clicking Pay resumes an already-loaded module instead of fetching it cold.
  useEffect(() => {
    if (!medusa) return;
    import("@paystack/inline-js").catch(() => {});
  }, [medusa]);

  useEffect(() => {
    if (!medusa || !cart.id || typeof window === "undefined") return;
    const returning = new URLSearchParams(window.location.search).get("paystack_return") === "1";
    const pending = window.localStorage.getItem("begnon_pending_checkout_cart") === cart.id;
    if (!returning && !pending) return;
    confirmAndCompleteMedusa(cart.id).catch((cause) => setCharge({ status: "error", message: cause instanceof Error ? cause.message : "Payment confirmation is still pending." }));
    // Cart identity is the stable resume key; this must run once per mounted checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medusa, cart.id]);

  // Best-effort: attaches this guest cart to the signed-in shopper's Medusa
  // customer so the resulting order shows up in their dashboard order
  // history later. Never blocks or surfaces errors to the payment UI.
  useEffect(() => {
    if (!medusa || !isSignedIn || !cart.id) return;
    fetch("/api/medusa/attach-cart-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId: cart.id }),
    }).catch(() => {});
  }, [medusa, isSignedIn, cart.id]);

  function pollForConfirmation(orderNumber: string) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { order?: { paymentStatus: string } };
          if (data.order?.paymentStatus === "paid") {
            if (pollRef.current) clearInterval(pollRef.current);
            window.location.href = `/confirmations?order=${orderNumber}`;
            return;
          }
        }
      } catch {}

      if (attempts >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        window.location.href = `/tracking?order=${orderNumber}`;
      }
    }, 3000);
  }

  const showForm = isSignedIn || guestChosen;
  const canSubmit = emailValid && phoneValid && addressValid;

  async function confirmAndCompleteMedusa(cartId: string) {
    if (completingRef.current) return;
    completingRef.current = true;
    setCharge({ status: "awaiting_approval", reference: cartId, orderNumber: cartId, message: "Confirming your payment securely..." });
    try {
      const checkout = createCheckoutService(medusaSdk.store);
      await finalizeVerifiedCheckout({
        cartId,
        waitUntilPaid: checkout.waitUntilPaid,
        complete: checkout.complete,
        resetAfterCheckout,
        clearPending: () => window.localStorage.removeItem("begnon_pending_checkout_cart"),
        redirect: (orderId) => {
          setCharge({ status: "success", orderNumber: orderId });
          setTimeout(() => { window.location.href = `/confirmations?order=${encodeURIComponent(orderId)}`; }, 700);
        },
      });
    } finally {
      completingRef.current = false;
    }
  }

  async function completeMedusaPayment(channel: "card" | "mobile_money") {
    if (!cart.id) throw new Error("Your cart is unavailable.");
    const checkout = createCheckoutService(medusaSdk.store);
    const prepared = await checkout.prepare(cart.id, { email, phone, address, displayName: customer?.displayName });
    const callbackUrl = `${window.location.origin}/checkout?paystack_return=1`;
    const payment = await checkout.initiate(prepared, channel, callbackUrl, channel === "mobile_money" ? { provider: momoProvider, phone: momoPhone.trim() } : undefined);
    window.localStorage.setItem("begnon_pending_checkout_cart", cart.id);
    if (payment.accessCode) {
      const { default: PaystackPop } = await import("@paystack/inline-js");
      // Hand off to Paystack's own popup UI - drop our modal so it doesn't render
      // underneath/behind theirs while the customer is entering payment details.
      setCharge({ status: "idle" });
      new PaystackPop().resumeTransaction(payment.accessCode, { onSuccess: () => { confirmAndCompleteMedusa(cart.id!).catch((cause) => setCharge({ status: "error", message: cause instanceof Error ? cause.message : "Payment confirmation is pending." })); }, onCancel: () => setCharge({ status: "error", message: "Payment was cancelled." }) });
      return;
    }
    if (payment.authorizationUrl) { window.location.href = payment.authorizationUrl; return; }
    setCharge({ status: "awaiting_approval", reference: payment.session.id, orderNumber: cart.id, message: "Approve the payment prompt. We will complete the order only after Paystack is verified." });
    confirmAndCompleteMedusa(cart.id).catch((cause) => setCharge({ status: "error", message: cause instanceof Error ? cause.message : "Payment confirmation is pending." }));
  }

  async function payWithMobileMoney() {
    if (!canSubmit || !momoPhoneValid) {
      setTouched({ email: true, phone: true, address: true, momoPhone: true });
      return;
    }

    setCharge({ status: "submitting" });

    if (medusa) {
      try { await completeMedusaPayment("mobile_money"); } catch (cause) { setCharge({ status: "error", message: cause instanceof Error ? cause.message : "Unable to start checkout." }); }
      return;
    }

    try {
      const response = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, address, momoPhone, provider: momoProvider }),
      });
      const data = (await response.json()) as {
        status?: string;
        orderNumber?: string;
        reference?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.orderNumber) {
        setCharge({ status: "error", message: data.error ?? "Unable to start the charge." });
        return;
      }

      if (data.status === "success") {
        setCharge({ status: "success", orderNumber: data.orderNumber });
        window.location.href = `/confirmations?order=${data.orderNumber}`;
        return;
      }

      if (data.status === "send_otp" && data.reference) {
        setCharge({
          status: "awaiting_otp",
          reference: data.reference,
          orderNumber: data.orderNumber,
          message: data.message ?? "Enter the OTP sent to your phone.",
        });
        return;
      }

      if (data.reference) {
        setCharge({
          status: "awaiting_approval",
          reference: data.reference,
          orderNumber: data.orderNumber,
          message: data.message ?? "Approve the payment prompt on your phone.",
        });
        pollForConfirmation(data.orderNumber);
        return;
      }

      setCharge({ status: "error", message: "Mobile money charge could not be started." });
    } catch {
      setCharge({ status: "error", message: "Checkout service is unreachable. Please try again." });
    }
  }

  async function submitOtp() {
    if (charge.status !== "awaiting_otp" || !otp.trim()) return;
    const { reference, orderNumber } = charge;

    setCharge({ status: "submitting" });

    try {
      const response = await fetch("/api/paystack/charge/submit-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, reference }),
      });
      const data = (await response.json()) as { status?: string; message?: string; error?: string };

      if (!response.ok) {
        setCharge({ status: "error", message: data.error ?? "That OTP did not work. Please try again." });
        return;
      }

      if (data.status === "success") {
        setCharge({ status: "success", orderNumber });
        window.location.href = `/confirmations?order=${orderNumber}`;
        return;
      }

      setCharge({
        status: "awaiting_approval",
        reference,
        orderNumber,
        message: data.message ?? "Confirming with your network...",
      });
      pollForConfirmation(orderNumber);
    } catch {
      setCharge({ status: "error", message: "Unable to verify the OTP. Please try again." });
    }
  }

  async function payWithCard() {
    if (!canSubmit) {
      setTouched({ email: true, phone: true, address: true, momoPhone: touched.momoPhone });
      return;
    }

    setCharge({ status: "submitting" });

    if (medusa) {
      try { await completeMedusaPayment("card"); } catch (cause) { setCharge({ status: "error", message: cause instanceof Error ? cause.message : "Unable to start checkout." }); }
      return;
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, address, callbackUrl: `${window.location.origin}/confirmations` }),
      });
      const data = (await response.json()) as {
        orderNumber?: string;
        accessCode?: string | null;
        authorizationUrl?: string | null;
        error?: string;
      };

      if (!response.ok || !data.orderNumber) {
        setCharge({ status: "error", message: data.error ?? "Unable to start checkout." });
        return;
      }

      if (data.accessCode) {
        const { default: PaystackPop } = await import("@paystack/inline-js");
        const popup = new PaystackPop();
        setCharge({ status: "idle" });
        popup.resumeTransaction(data.accessCode, {
          onSuccess: () => {
            setCharge({
              status: "awaiting_approval",
              reference: data.orderNumber!,
              orderNumber: data.orderNumber!,
              message: "Confirming your payment...",
            });
            pollForConfirmation(data.orderNumber!);
          },
          onCancel: () => {
            setCharge({ status: "error", message: "Payment was cancelled." });
          },
        });
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      setCharge({ status: "error", message: data.error ?? "Card payment is unavailable right now." });
    } catch {
      setCharge({ status: "error", message: "Checkout service is unreachable. Please try again." });
    }
  }

  return (
    <>
      {charge.status === "submitting" || charge.status === "awaiting_approval" ? (
        <PaymentStatusModal status="confirming" message={charge.status === "awaiting_approval" ? charge.message : "Starting your payment..."} />
      ) : charge.status === "success" ? (
        <PaymentStatusModal status="success" message="Redirecting you to your order confirmation..." />
      ) : charge.status === "error" ? (
        <PaymentStatusModal status="error" message={charge.message} onDismiss={() => setCharge({ status: "idle" })} />
      ) : null}
      <section className="ed-checkout">
      <div className="ed-checkout-main">
        {!showForm ? (
          <div className="ed-checkout-panel">
            <div className="ed-checkout-step">
              <span className="ed-checkout-step-number">1</span>
              <p className="ed-eyebrow">Step 1</p>
            </div>
            <h2>Sign in or continue as guest.</h2>
            <p className="ed-checkout-sub">Signing in saves this order to your account and pre-fills your details next time.</p>
            <div className="ed-checkout-gate-actions">
              <a className="ed-btn-solid" href={`/login?redirectTo=${encodeURIComponent("/checkout")}`}>
                <LogIn size={16} />
                Sign in
              </a>
              <button className="ed-btn-outline" onClick={() => setGuestChosen(true)}>
                <UserRound size={16} />
                Continue as guest
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ed-checkout-panel">
              <div className="ed-checkout-step">
                <span className="ed-checkout-step-number">1</span>
                <p className="ed-eyebrow">Step 1</p>
              </div>
              <h2>{isSignedIn ? `Signed in as ${customer?.displayName || email}` : "Checking out as guest"}</h2>
              {!isSignedIn ? (
                <p className="ed-checkout-sub">
                  Have an account? <a href={`/login?redirectTo=${encodeURIComponent("/checkout")}`}>Sign in instead</a>.
                </p>
              ) : null}
              <div className="ed-checkout-form">
                <label className="ed-buybox-field">
                  <span>Email</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => markTouched("email")}
                    type="email"
                    placeholder="you@example.com"
                  />
                  {touched.email && !emailValid ? <p className="ed-field-error">Enter a valid email address.</p> : null}
                </label>
                <label className="ed-buybox-field">
                  <span>Phone</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    onBlur={() => markTouched("phone")}
                    placeholder="024 000 0000 or +233 24 000 0000"
                  />
                  {touched.phone && !phoneValid ? <p className="ed-field-error">Enter a valid Ghana phone number.</p> : null}
                </label>
                <label className="ed-buybox-field">
                  <span>Delivery address</span>
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    onBlur={() => markTouched("address")}
                    placeholder="Street, area, city"
                  />
                  {touched.address && !addressValid ? <p className="ed-field-error">Add a delivery address.</p> : null}
                </label>
              </div>
            </div>

            <div className="ed-checkout-panel">
              <div className="ed-checkout-step">
                <span className="ed-checkout-step-number">2</span>
                <p className="ed-eyebrow">Step 2</p>
              </div>
              <h2>Choose how to pay.</h2>
              <div className="ed-checkout-tabs" role="tablist" aria-label="Payment method">
                <button className={paymentMethod === "mobile_money" ? "is-active" : ""} onClick={() => setPaymentMethod("mobile_money")}>
                  <Smartphone size={15} />
                  Mobile Money
                </button>
                <button className={paymentMethod === "card" ? "is-active" : ""} onClick={() => setPaymentMethod("card")}>
                  <CreditCard size={15} />
                  Card
                </button>
              </div>

              {paymentMethod === "mobile_money" ? (
                <div className="ed-checkout-form">
                  <label className="ed-buybox-field">
                    <span>Network</span>
                    <select value={momoProvider} onChange={(event) => setMomoProvider(event.target.value as GhanaMobileMoneyProvider)}>
                      {NETWORKS.map((network) => (
                        <option key={network.value} value={network.value}>
                          {network.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ed-buybox-field">
                    <span>Mobile Money number</span>
                    <input
                      value={momoPhone}
                      onChange={(event) => setMomoPhone(event.target.value)}
                      onBlur={() => markTouched("momoPhone")}
                      placeholder="024 000 0000"
                    />
                    {touched.momoPhone && !momoPhoneValid ? <p className="ed-field-error">Enter a valid Mobile Money number.</p> : null}
                  </label>

                  {charge.status === "awaiting_otp" ? (
                    <>
                      <p className="ed-buybox-notice">{charge.message}</p>
                      <label className="ed-buybox-field">
                        <span>OTP</span>
                        <input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" placeholder="6-digit code" />
                      </label>
                      <button className="ed-btn-solid" onClick={submitOtp} disabled={!otp.trim()}>
                        <CheckCircle2 size={16} />
                        Confirm code
                      </button>
                    </>
                  ) : (
                    <button
                      className="ed-btn-solid"
                      disabled={charge.status === "submitting" || charge.status === "awaiting_approval"}
                      onClick={payWithMobileMoney}
                    >
                      <Smartphone size={16} />
                      Pay {formatMoney(cart.totals.total)}
                    </button>
                  )}
                </div>
              ) : (
                <div className="ed-checkout-form">
                  <p className="ed-checkout-sub">Card details are entered securely in Paystack&apos;s payment window — we never see or store your card number.</p>
                  <button
                    className="ed-btn-solid"
                    disabled={charge.status === "submitting" || charge.status === "awaiting_approval"}
                    onClick={payWithCard}
                  >
                    <CreditCard size={16} />
                    Pay {formatMoney(cart.totals.total)}
                  </button>
                </div>
              )}

              <p className="ed-checkout-secure">
                <ShieldCheck size={15} />
                Secure payment
              </p>
            </div>
          </>
        )}
      </div>

      <aside className="ed-bag-summary ed-checkout-summary">
        <h2>{cart.totals.quantity} item{cart.totals.quantity === 1 ? "" : "s"}</h2>
        <div className="ed-bag-summary-lines">
          {cart.items.map((item) => (
            <div className="ed-checkout-summary-item" key={item.id}>
              <div className="ed-checkout-summary-thumb">
                <Image src={item.image} alt={item.name} fill sizes="44px" />
              </div>
              <div className="ed-checkout-summary-item-lines">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="ed-bag-summary-lines">
          <div>
            <span>Subtotal</span>
            <span>{formatMoney(cart.totals.subtotal)}</span>
          </div>
          <div>
            <span>Delivery</span>
            <span>{formatMoney(cart.totals.shipping)}</span>
          </div>
          <div className="ed-bag-summary-total">
            <span>Total</span>
            <span>{formatMoney(cart.totals.total)}</span>
          </div>
        </div>
      </aside>
      </section>
    </>
  );
}
