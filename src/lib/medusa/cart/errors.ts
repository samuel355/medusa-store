export class MedusaCartContractError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`Medusa cart response is missing required field: ${field}`);
    this.name = "MedusaCartContractError";
    this.field = field;
  }
}

export class MedusaCartOperationError extends Error {
  readonly operation: string;
  override readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    super(`Medusa cart operation failed: ${operation}`, { cause });
    this.name = "MedusaCartOperationError";
    this.operation = operation;
    this.cause = cause;
  }
}
