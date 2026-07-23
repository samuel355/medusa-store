import { createHmac, timingSafeEqual } from "node:crypto"
import { MedusaError } from "@medusajs/utils"
import { AbstractPaymentProvider } from "./medusa-utils"
import type {
  AuthorizePaymentInput, AuthorizePaymentOutput, CancelPaymentInput,
  CancelPaymentOutput, CapturePaymentInput, CapturePaymentOutput,
  DeletePaymentInput, DeletePaymentOutput, GetPaymentStatusInput,
  GetPaymentStatusOutput, InitiatePaymentInput, InitiatePaymentOutput,
  ProviderWebhookPayload, RefundPaymentInput, RefundPaymentOutput,
  RetrievePaymentInput, RetrievePaymentOutput, UpdatePaymentInput,
  UpdatePaymentOutput, WebhookActionResult,
} from "@medusajs/framework/types"
import type { PaystackOptions, PaystackResponse, PaystackTransaction } from "./types"

type Dependencies = Record<string, unknown>
type Fetch = typeof fetch

export class PaystackProviderError extends MedusaError {
  readonly operation: string
  constructor(operation: string, message: string, cause?: unknown) {
    super(MedusaError.Types.UNEXPECTED_STATE, `Paystack ${operation}: ${message}`)
    this.operation = operation
    if (cause) (this as Error & { cause?: unknown }).cause = cause
  }
}

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new PaystackProviderError("validation", `missing ${field}`)
  return value.trim()
}

function number(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new PaystackProviderError("validation", "invalid amount")
  return parsed
}

export default class PaystackPaymentService extends AbstractPaymentProvider<PaystackOptions> {
  static identifier = "paystack"
  private readonly secretKey_: string
  private readonly baseUrl_: string
  private readonly fetch_: Fetch
  private readonly initializations_ = new Map<string, Promise<InitiatePaymentOutput>>()

  static validateOptions(options: Record<string, unknown>) {
    text(options.secretKey, "secretKey")
  }

  constructor(container: Dependencies, options: PaystackOptions, fetcher: Fetch = fetch) {
    super(container, options)
    PaystackPaymentService.validateOptions(options as unknown as Record<string, unknown>)
    this.secretKey_ = options.secretKey
    this.baseUrl_ = options.baseUrl ?? "https://api.paystack.co"
    this.fetch_ = fetcher
  }

  private async request<T>(operation: string, path: string, init?: RequestInit): Promise<T> {
    try {
      const response = await this.fetch_(`${this.baseUrl_}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.secretKey_}`, "Content-Type": "application/json", ...init?.headers },
      })
      const payload = await response.json() as PaystackResponse<T>
      if (!response.ok || !payload.status) throw new Error(payload.message || `HTTP ${response.status}`)
      return payload.data
    } catch (cause) {
      if (cause instanceof PaystackProviderError) throw cause
      throw new PaystackProviderError(operation, cause instanceof Error ? cause.message : "request failed", cause)
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const email = text(input.data?.email ?? input.context?.customer?.email, "email")
    const sessionId = text(input.data?.session_id ?? input.context?.idempotency_key, "session id")
    const callbackUrl = input.data?.callback_url
    const existing = this.initializations_.get(sessionId)
    if (existing) return existing
    const initialization = this.request<PaystackTransaction>("initialize", "/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email, amount: Math.round(number(input.amount) * 100), currency: input.currency_code.toUpperCase(),
        reference: input.context?.idempotency_key,
        callback_url: typeof callbackUrl === "string" ? callbackUrl : undefined,
        channels: input.data?.channels,
        metadata: { ...(input.data?.metadata as object ?? {}), mobile_money: input.data?.mobile_money, medusa_session_id: sessionId },
      }),
    }).then((transaction) => ({ id: transaction.reference, status: "pending" as const, data: transaction as unknown as Record<string, unknown> }))
    this.initializations_.set(sessionId, initialization)
    try { return await initialization }
    catch (cause) { this.initializations_.delete(sessionId); throw cause }
  }

  async retrievePayment({ data }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const transaction = await this.request<PaystackTransaction>("retrieve", `/transaction/verify/${encodeURIComponent(text(data?.reference, "reference"))}`)
    return { data: transaction as unknown as Record<string, unknown> }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (await this.retrievePayment(input)).data as PaystackTransaction
    const status = data.status === "success" ? "captured" : data.status === "failed" || data.status === "abandoned" ? "error" : "pending"
    return { status, data: data as unknown as Record<string, unknown> }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const result = await this.getPaymentStatus(input)
    return { status: result.status, data: result.data }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const result = await this.retrievePayment(input)
    const transaction = result.data as PaystackTransaction
    if (transaction.status !== "success") throw new PaystackProviderError("capture", "transaction is not successful")
    return result
  }

  async refundPayment({ data, amount }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const refund = await this.request<Record<string, unknown>>("refund", "/refund", { method: "POST", body: JSON.stringify({ transaction: text(data?.reference, "reference"), amount: Math.round(number(amount) * 100) }) })
    return { data: refund }
  }

  async cancelPayment({ data }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const reference = text(data?.reference, "reference")
    const current = (await this.retrievePayment({ data } as RetrievePaymentInput)).data as PaystackTransaction
    if (current.status === "success") throw new PaystackProviderError("cancel", "captured transactions cannot be canceled")
    return { data: { ...current, reference, status: "abandoned" } }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    await this.cancelPayment(input)
    return { data: { deleted: true } }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const current = (await this.retrievePayment(input)).data as PaystackTransaction
    if (current.status === "success") return { status: "captured", data: current as unknown as Record<string, unknown> }
    return this.initiatePayment(input).then(({ status, data }) => ({ status, data }))
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const signature = String(payload.headers["x-paystack-signature"] ?? payload.headers["X-Paystack-Signature"] ?? "")
    const expected = createHmac("sha512", this.secretKey_).update(payload.rawData).digest("hex")
    const supplied = Buffer.from(signature, "utf8")
    const valid = supplied.length === Buffer.byteLength(expected) && timingSafeEqual(supplied, Buffer.from(expected))
    if (!valid) throw new PaystackProviderError("webhook", "invalid signature")
    const event = payload.data as { event?: string; data?: PaystackTransaction }
    const sessionId = event.data?.metadata?.medusa_session_id
    if (typeof sessionId !== "string" || !sessionId) return { action: "not_supported" }
    const amount = number(event.data?.amount ?? 0) / 100
    if (event.event === "charge.success") return { action: "captured", data: { session_id: sessionId, amount } }
    if (event.event === "charge.failed") return { action: "failed", data: { session_id: sessionId, amount } }
    return { action: "not_supported" }
  }
}
