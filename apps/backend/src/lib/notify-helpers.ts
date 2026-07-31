import type { Logger } from "@medusajs/framework/types"

export function money(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency: currencyCode.toUpperCase(), maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currencyCode.toUpperCase()} ${amount.toFixed(0)}`
  }
}

type NotificationInput = {
  to: string
  channel: string
  template: string
  data?: Record<string, unknown>
  content?: { subject?: string; html?: string }
}

export async function sendNotifications(
  notificationService: { createNotifications(input: NotificationInput): Promise<unknown> },
  logger: Logger,
  notifications: Array<NotificationInput | null>,
) {
  await Promise.all(notifications.filter((n): n is NotificationInput => n !== null).map(async (notification) => {
    try {
      await notificationService.createNotifications(notification)
    } catch (error) {
      logger.error(`[notify] failed to send ${notification.channel} to ${notification.to}`, error as Error)
    }
  }))
}
