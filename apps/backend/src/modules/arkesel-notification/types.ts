export type ArkeselOptions = {
  apiKey: string
  sender?: string
}

export type SendNotificationInput = {
  to: string
  channel: string
  template: string
  data?: Record<string, unknown>
  content?: { text?: string }
}
