export class MedusaCatalogueContractError extends Error {
  readonly field: string;
  readonly value: unknown;

  constructor(field: string, value: unknown) {
    super(`Invalid Medusa catalogue field: ${field}`);
    this.name = "MedusaCatalogueContractError";
    this.field = field;
    this.value = value;
  }
}
