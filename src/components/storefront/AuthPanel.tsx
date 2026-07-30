"use client";

import { ArrowRight, CheckCircle2, Mail, Smartphone, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type AuthPanelProps = {
  initialMode?: "login" | "signup";
};

export function AuthPanel({ initialMode = "login" }: AuthPanelProps) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || undefined;
  const [method, setMethod] = useState("Phone");
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const endpoint = method === "Phone" ? "/api/auth/phone-otp" : method === "Email" ? "/api/auth/email-password" : "/api/auth/google";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          method === "Phone"
            ? { phone: value, token: otpSent ? otp : undefined, step: otpSent ? "verify" : "send" }
            : method === "Email"
              ? { email: value, password, mode }
              : { origin: window.location.origin, redirectTo }
        ),
      });
      const data = (await response.json()) as {
        error?: string;
        url?: string;
        sent?: boolean;
        redirectTo?: string;
        pendingConfirmation?: boolean;
        message?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to start sign-in.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.sent) {
        setOtpSent(true);
        setMessage("Code sent. Enter the OTP to finish login.");
        return;
      }

      if (data.pendingConfirmation) {
        setMessage(data.message ?? "Check your email to confirm your account.");
        return;
      }

      setMessage(
        method === "Phone"
          ? "Phone verified. Redirecting to your dashboard..."
          : mode === "signup"
            ? "Account created. Redirecting..."
            : "Signed in successfully."
      );
      window.setTimeout(() => {
        window.location.href = redirectTo || data.redirectTo || "/customers";
      }, 700);
    } catch {
      setMessage("Auth service is not reachable in this environment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="auth" className="ed-auth">
      <p className="ed-eyebrow">Customer account</p>
      <h1>{mode === "signup" ? "Create your account." : "Welcome back."}</h1>
      <p className="ed-checkout-sub">Save orders, addresses, wishlist items, returns, and delivery updates.</p>
      {message ? <p className="ed-notice">{message}</p> : null}

      <div className="ed-checkout-tabs" role="tablist" aria-label="Login methods">
        {["Phone", "Email", "Google"].map((item) => (
          <button className={method === item ? "is-active" : ""} key={item} onClick={() => setMethod(item)}>
            {item === "Phone" ? <Smartphone size={15} /> : item === "Email" ? <Mail size={15} /> : <UserRound size={15} />}
            {item}
          </button>
        ))}
      </div>

      <div className="ed-checkout-form">
        {method !== "Google" ? (
          <label className="ed-buybox-field">
            <span>{method === "Phone" ? "Mobile number" : "Email address"}</span>
            <input
              type={method === "Phone" ? "tel" : "email"}
              placeholder={method === "Phone" ? "+233 24 000 0000" : "customer@begnon.com"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        ) : (
          <div className="ed-google-auth">
            <UserRound size={18} />
            <div>
              <strong>Continue with Google</strong>
              <span>Secure OAuth sign-in for your Begnon account.</span>
            </div>
          </div>
        )}
        {method === "Phone" && otpSent ? (
          <label className="ed-buybox-field">
            <span>Verification code</span>
            <input
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </label>
        ) : null}
        {method === "Email" ? (
          <>
            <label className="ed-buybox-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className="ed-checkout-tabs ed-auth-mode-tabs" role="tablist" aria-label="Email auth mode">
              {(["login", "signup"] as const).map((item) => (
                <button className={mode === item ? "is-active" : ""} key={item} onClick={() => setMode(item)}>
                  {item === "login" ? "Login" : "Sign up"}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <button className="ed-btn-solid" disabled={isSubmitting} onClick={submit}>
          {isSubmitting
            ? "Please wait..."
            : method === "Phone"
              ? otpSent
                ? "Verify and continue"
                : "Send secure code"
              : method === "Google"
                ? "Continue with Google"
                : mode === "signup"
                  ? "Create account"
                  : "Login"}
          {otpSent ? <CheckCircle2 size={16} /> : method === "Phone" ? <Smartphone size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>

      <p className="ed-checkout-secure">Protected checkout, order tracking, and wishlist sync.</p>
      <div className="ed-auth-switch">
        {mode === "login" ? "New here?" : "Already have an account?"}
        <a href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Create account" : "Login"}
        </a>
      </div>
    </div>
  );
}
