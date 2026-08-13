import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICacheService } from "@medusajs/framework/types"

// Completes a mobile money Direct Charge (see initiatePayment's
// isDirectMobileMoneyCharge branch in paystack-payment/service.ts) once
// Paystack has texted the customer an OTP. Not part of Medusa's
// AbstractPaymentProvider lifecycle - paystack-payment is registered as a
// provider inside the Payment module, not a container-resolvable module, so
// this talks to Paystack directly with the same secret key rather than
// trying to reach into that provider instance.
//
// This only ever completes the *payment session* at Paystack, never the
// order - the storefront still calls cart.complete() afterward, which goes
// through authorizePaymentSessionStep and live-verifies the transaction via
// GET /transaction/verify. A forged/guessed OTP here still can't create an
// order; it can only fail (or succeed) the charge that reference already
// points to.
const RATE_LIMIT_MAX_ATTEMPTS = 8
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60

function clientIp(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim()
  return req.ip ?? "unknown"
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { otp?: string; reference?: string }
  const otp = (body.otp ?? "").trim()
  const reference = (body.reference ?? "").trim()

  if (!otp || !reference) {
    // `message`, not `error` - the Medusa JS SDK's client throws using
    // jsonError.message for a non-ok response (see @medusajs/js-sdk's
    // client.js), so this is what actually reaches the storefront's caller.
    res.status(400).json({ message: "otp and reference are required." })
    return
  }

  try {
    const cacheService: ICacheService = req.scope.resolve(Modules.CACHE)
    const rateLimitKey = `paystack-submit-otp-rl:${clientIp(req)}`
    const attempts = (await cacheService.get<number>(rateLimitKey)) ?? 0
    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      res.status(429).json({ message: "Too many attempts. Please try again later." })
      return
    }
    await cacheService.set(rateLimitKey, attempts + 1, RATE_LIMIT_WINDOW_SECONDS)
  } catch {
    // Best-effort - a cache outage should never block a legitimate charge.
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    res.status(500).json({ message: "Mobile money checkout is not configured." })
    return
  }

  try {
    const response = await fetch("https://api.paystack.co/charge/submit_otp", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ otp, reference }),
    })
    const payload = (await response.json()) as { status: boolean; message?: string; data?: { status?: string; display_text?: string; reference?: string; message?: string } }
    // Neither the HTTP status nor the top-level `status`/`message` fields
    // are reliable here (confirmed against the live Paystack sandbox for
    // the sibling /charge endpoint: both can reflect a non-2xx/false
    // "status" for a perfectly normal outcome, and the top-level message is
    // a fixed generic string). The real state - and, on a genuine failure,
    // the real reason - lives on `data`/`data.message`. This mirrors the
    // proven legacy implementation
    // (src/app/api/paystack/charge/submit-otp/route.ts), which only ever
    // inspected `data.status`.
    if (!payload.data) {
      res.status(400).json({ message: payload.message || "That code didn't work. Please try again." })
      return
    }
    if (payload.data.status === "failed" || payload.data.status === "abandoned") {
      res.status(400).json({ message: payload.data.message || "That code didn't work. Please try again." })
      return
    }
    res.status(200).json({
      status: payload.data.status ?? "pending",
      reference: payload.data.reference ?? reference,
      displayText: payload.data.display_text,
    })
  } catch {
    res.status(502).json({ message: "Unable to reach the payment provider. Please try again." })
  }
}
