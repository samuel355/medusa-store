export type PaystackOptions = {
  secretKey: string
  baseUrl?: string
}

export type PaystackResponse<T> = {
  status: boolean
  message: string
  data: T
}

export type PaystackTransaction = {
  reference: string
  status: string
  amount: number
  access_code?: string
  authorization_url?: string
  // Direct Charge (/charge, /charge/submit_otp) response fields - absent on
  // Standard Checkout (/transaction/initialize) responses. `message` here is
  // per-transaction (e.g. a decline reason) - distinct from
  // PaystackResponse.message, which for /charge is always the fixed,
  // generic string "Charge attempted" regardless of outcome.
  display_text?: string
  message?: string
  metadata?: Record<string, unknown>
}
