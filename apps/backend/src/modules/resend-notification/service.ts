import { MedusaError } from "@medusajs/utils"
import { AbstractNotificationProviderService } from "./medusa-utils"
import type { ResendOptions, SendNotificationInput } from "./types"

type Dependencies = Record<string, unknown>
type Fetch = typeof fetch

export class ResendProviderError extends MedusaError {
  readonly operation: string
  constructor(operation: string, message: string, cause?: unknown) {
    super(MedusaError.Types.UNEXPECTED_STATE, `Resend ${operation}: ${message}`)
    this.operation = operation
    if (cause) (this as Error & { cause?: unknown }).cause = cause
  }
}

export default class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "resend-notification"
  private readonly apiKey_: string
  private readonly from_: string
  private readonly fetch_: Fetch

  static validateOptions(options: Record<string, unknown>) {
    if (typeof options.apiKey !== "string" || !options.apiKey.trim()) {
      throw new ResendProviderError("validation", "missing apiKey")
    }
    if (typeof options.from !== "string" || !options.from.trim()) {
      throw new ResendProviderError("validation", "missing from")
    }
  }

  constructor(_container: Dependencies, options: ResendOptions, fetcher: Fetch = fetch) {
    super()
    ResendNotificationService.validateOptions(options as unknown as Record<string, unknown>)
    this.apiKey_ = options.apiKey
    this.from_ = options.from
    this.fetch_ = fetcher
  }

  async send(notification: SendNotificationInput) {
    const subject = notification.content?.subject ?? "Update from Begnon"
    const html = notification.content?.html ?? notification.content?.text ?? ""

    const response = await this.fetch_("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey_}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from_, to: [notification.to], subject, html }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new ResendProviderError("send", `status ${response.status}: ${body}`)
    }

    const result = (await response.json()) as { id?: string }
    return { id: result.id }
  }
}
