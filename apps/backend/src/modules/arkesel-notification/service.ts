import { MedusaError } from "@medusajs/utils"
import { AbstractNotificationProviderService } from "./medusa-utils"
import type { ArkeselOptions, SendNotificationInput } from "./types"

type Dependencies = Record<string, unknown>
type Fetch = typeof fetch

export class ArkeselProviderError extends MedusaError {
  readonly operation: string
  constructor(operation: string, message: string, cause?: unknown) {
    super(MedusaError.Types.UNEXPECTED_STATE, `Arkesel ${operation}: ${message}`)
    this.operation = operation
    if (cause) (this as Error & { cause?: unknown }).cause = cause
  }
}

export default class ArkeselNotificationService extends AbstractNotificationProviderService {
  static identifier = "arkesel-notification"
  private readonly apiKey_: string
  private readonly sender_: string
  private readonly fetch_: Fetch

  static validateOptions(options: Record<string, unknown>) {
    if (typeof options.apiKey !== "string" || !options.apiKey.trim()) {
      throw new ArkeselProviderError("validation", "missing apiKey")
    }
  }

  constructor(_container: Dependencies, options: ArkeselOptions, fetcher: Fetch = fetch) {
    super()
    ArkeselNotificationService.validateOptions(options as unknown as Record<string, unknown>)
    this.apiKey_ = options.apiKey
    this.sender_ = options.sender ?? "Begnon"
    this.fetch_ = fetcher
  }

  async send(notification: SendNotificationInput) {
    const message = notification.content?.text ?? (notification.data?.message as string | undefined)
    if (!message) throw new ArkeselProviderError("validation", "missing message text")

    const response = await this.fetch_("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": this.apiKey_, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: this.sender_, message, recipients: [notification.to] }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new ArkeselProviderError("send", `status ${response.status}: ${body}`)
    }

    return { id: undefined }
  }
}
