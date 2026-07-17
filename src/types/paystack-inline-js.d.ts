declare module "@paystack/inline-js" {
  export type PaystackTransactionResponse = {
    reference: string;
    status: string;
    trans: string;
    transaction: string;
    trxref: string;
    message: string;
  };

  export type PaystackTransactionCallbacks = {
    onSuccess?: (response: PaystackTransactionResponse) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
    onLoad?: () => void;
  };

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackTransactionCallbacks): void;
    newTransaction(options: PaystackTransactionCallbacks & Record<string, unknown>): void;
  }
}
