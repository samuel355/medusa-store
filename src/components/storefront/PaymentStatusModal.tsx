"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

type PaymentStatusModalProps = {
  status: "opening" | "confirming" | "success" | "error";
  message: string;
  onDismiss?: () => void;
};

export function PaymentStatusModal({ status, message, onDismiss }: PaymentStatusModalProps) {
  return (
    <div className="ed-payment-modal-backdrop" role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className="ed-payment-modal">
        {onDismiss ? (
          <button className="ed-payment-modal-close" onClick={onDismiss} type="button" aria-label="Close">
            <X size={18} />
          </button>
        ) : null}
        {status === "opening" ? (
          <>
            <Loader2 size={32} className="spin" />
            <h2>Starting your payment</h2>
            <p>{message}</p>
          </>
        ) : status === "confirming" ? (
          <>
            <Loader2 size={32} className="spin" />
            <h2>Confirming your payment</h2>
            <p>{message}</p>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 size={32} className="ed-payment-modal-success" />
            <h2>Payment confirmed</h2>
            <p>{message}</p>
          </>
        ) : (
          <>
            <AlertTriangle size={32} className="ed-payment-modal-error" />
            <h2>Payment could not be completed</h2>
            <p>{message}</p>
            {onDismiss ? (
              <button className="ed-btn-solid" onClick={onDismiss} type="button">
                Try again
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
