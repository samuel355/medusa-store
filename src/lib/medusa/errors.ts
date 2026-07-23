export class MedusaIntegrationError extends Error {
  readonly operation: string;
  override readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super(`Medusa Store API operation failed: ${operation}`, { cause });
    this.name = "MedusaIntegrationError";
    this.operation = operation;
    this.cause = cause;
  }
}
