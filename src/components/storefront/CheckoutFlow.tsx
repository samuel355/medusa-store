"use client";

import { CheckCircle2, CreditCard, Loader2, LogIn, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type CartWithItems } from "@/lib/db/cart";
import { formatMoney } from "@/lib/utils/money";
import type { GhanaMobileMoneyProvider } from "@/lib/integrations/paystack";

type CheckoutFlowProps = {
  cart: CartWithItems;
  isSignedIn: boolean;
  customer: { displayName: string; email: string; phone: string } | null;
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

export function CheckoutFlow({ cart, isSignedIn, customer }: CheckoutFlowProps) {
  const [guestChosen, setGuestChosen] = useState(false);
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "+233 ");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [momoProvider, setMomoProvider] = useState<GhanaMobileMoneyProvider>("mtn");
  const [momoPhone, setMomoPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [charge, setCharge] = useState<ChargeState>({ status: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
      } catch {
        // keep polling
      }

      if (attempts >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        window.location.href = `/tracking?order=${orderNumber}`;
      }
    }, 3000);
  }

  const showForm = isSignedIn || guestChosen;
  const canSubmit = Boolean(email.trim()) && Boolean(address.trim());

  async function payWithMobileMoney() {
    if (!canSubmit || !momoPhone.trim()) {
      setCharge({ status: "error", message: "Add your email, delivery address, and Mobile Money number." });
      return;
    }

    setCharge({ status: "submitting" });

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
      setCharge({ status: "error", message: "Add your email and delivery address first." });
      return;
    }

    setCharge({ status: "submitting" });

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
    <section className="cart-layout checkout-flow">
      <div className="checkout-flow-main">
        {!showForm ? (
          <div className="checkout-panel checkout-gate">
            <p className="kicker">Step 1</p>
            <h2>Sign in or continue as guest.</h2>
            <p>Signing in saves this order to your account and pre-fills your details next time.</p>
            <div className="checkout-gate-actions">
              <a className="primary-action" href={`/login?redirectTo=${encodeURIComponent("/checkout")}`}>
                <LogIn size={18} />
                Sign in
              </a>
              <button className="secondary-action" onClick={() => setGuestChosen(true)}>
                <UserRound size={18} />
                Continue as guest
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="checkout-panel">
              <p className="kicker">Step 1</p>
              <h2>{isSignedIn ? `Signed in as ${customer?.displayName || email}` : "Checking out as guest"}</h2>
              {!isSignedIn ? (
                <p>
                  Have an account? <a href={`/login?redirectTo=${encodeURIComponent("/checkout")}`}>Sign in instead</a>.
                </p>
              ) : null}
              <div className="checkout-form">
                <label>
                  Email
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" />
                </label>
                <label>
                  Phone
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
                <label>
                  Delivery address
                  <textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, area, city" />
                </label>
              </div>
            </div>

            <div className="checkout-panel">
              <p className="kicker">Step 2</p>
              <h2>Choose how to pay.</h2>
              <div className="login-tabs payment-method-tabs" role="tablist" aria-label="Payment method">
                <button className={paymentMethod === "mobile_money" ? "active" : ""} onClick={() => setPaymentMethod("mobile_money")}>
                  <Smartphone size={16} />
                  Mobile Money
                </button>
                <button className={paymentMethod === "card" ? "active" : ""} onClick={() => setPaymentMethod("card")}>
                  <CreditCard size={16} />
                  Card
                </button>
              </div>

              {paymentMethod === "mobile_money" ? (
                <div className="checkout-form">
                  <label>
                    Network
                    <select value={momoProvider} onChange={(event) => setMomoProvider(event.target.value as GhanaMobileMoneyProvider)}>
                      {NETWORKS.map((network) => (
                        <option key={network.value} value={network.value}>
                          {network.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mobile Money number
                    <input value={momoPhone} onChange={(event) => setMomoPhone(event.target.value)} placeholder="024 000 0000" />
                  </label>

                  {charge.status === "awaiting_otp" ? (
                    <>
                      <p className="inline-notice">{charge.message}</p>
                      <label>
                        OTP
                        <input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" placeholder="6-digit code" />
                      </label>
                      <button className="pay-button" onClick={submitOtp} disabled={!otp.trim()}>
                        <CheckCircle2 size={18} />
                        Confirm code
                      </button>
                    </>
                  ) : charge.status === "awaiting_approval" ? (
                    <p className="inline-notice">
                      <Loader2 size={16} className="spin" /> {charge.message}
                    </p>
                  ) : (
                    <button
                      className="pay-button"
                      disabled={charge.status === "submitting" || !canSubmit || !momoPhone.trim()}
                      onClick={payWithMobileMoney}
                    >
                      <Smartphone size={18} />
                      {charge.status === "submitting" ? "Starting..." : `Pay ${formatMoney(cart.totals.total)}`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="checkout-form">
                  <p className="muted-copy">Card details are entered securely in Paystack's payment window — we never see or store your card number.</p>
                  <button className="pay-button" disabled={charge.status === "submitting" || !canSubmit} onClick={payWithCard}>
                    <CreditCard size={18} />
                    {charge.status === "submitting" ? "Starting..." : `Pay ${formatMoney(cart.totals.total)}`}
                  </button>
                </div>
              )}

              {charge.status === "error" ? <p className="inline-notice checkout-error">{charge.message}</p> : null}

              <div className="checkout-trust cart-checkout-trust">
                <span>
                  <ShieldCheck size={16} />
                  Secure payment
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <aside className="checkout-panel cart-summary checkout-flow-summary">
        <div className="checkout-head">
          <div>
            <p className="kicker">Order summary</p>
            <h2>{cart.totals.quantity} item{cart.totals.quantity === 1 ? "" : "s"}</h2>
          </div>
        </div>
        <div className="checkout-lines">
          {cart.items.map((item) => (
            <div key={item.id}>
              <span>
                {item.quantity}x {item.name}
              </span>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </div>
          ))}
        </div>
        <div className="checkout-lines">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(cart.totals.subtotal)}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>{formatMoney(cart.totals.shipping)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatMoney(cart.totals.total)}</strong>
          </div>
        </div>
      </aside>
    </section>
  );
}
