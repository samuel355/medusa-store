import type { Logger } from "@medusajs/framework/types"

// Order/line-item money fields come back from query.graph() as Medusa's
// BigNumberValue (number | string | a BigNumber-ish object), not guaranteed
// to be a plain JS number the way the HTTP API layer serializes it. Number()
// correctly coerces all of those (a BigNumber instance stringifies to its
// decimal value via valueOf/toString) - anything that still isn't finite
// falls back to 0 instead of rendering as "GH₵NaN" or silently formatting a
// non-numeric object as zero.
export function toAmount(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function money(amount: unknown, currencyCode: string) {
  const safeAmount = toAmount(amount)
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency: currencyCode.toUpperCase(), maximumFractionDigits: 0 }).format(safeAmount)
  } catch {
    return `${currencyCode.toUpperCase()} ${safeAmount.toFixed(0)}`
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
