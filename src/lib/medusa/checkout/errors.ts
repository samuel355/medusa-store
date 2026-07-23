export class MedusaCheckoutError extends Error {
  constructor(readonly operation: string, message: string, readonly cause?: unknown) {
    super(message)
    this.name = "MedusaCheckoutError"
  }
}
