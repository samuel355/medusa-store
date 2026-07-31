export type ResendOptions = {
  apiKey: string
  from: string
}

export type NotificationContent = {
  subject?: string
  text?: string
  html?: string
}

export type SendNotificationInput = {
  to: string
  channel: string
  template: string
  data?: Record<string, unknown>
  content?: NotificationContent
}
