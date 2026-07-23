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
  metadata?: Record<string, unknown>
}
