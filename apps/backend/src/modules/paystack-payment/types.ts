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
  // Standard Checkout (/transaction/initialize) responses.
  display_text?: string
  metadata?: Record<string, unknown>
}
