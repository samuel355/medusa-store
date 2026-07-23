import type { HttpTypes } from "@medusajs/types";
import { MedusaCheckoutError } from "./errors";

export const PAYSTACK_PROVIDER_ID = "pp_paystack_paystack";

export type CheckoutSdkBoundary = {
  cart: {
    retrieve(id: string, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
    update(id: string, body: HttpTypes.StoreUpdateCart, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
    addShippingMethod(id: string, body: HttpTypes.StoreAddCartShippingMethods, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
    complete(id: string): Promise<HttpTypes.StoreCompleteCartResponse>;
  };
  fulfillment: {
    listCartOptions(query: { cart_id: string }): Promise<HttpTypes.StoreShippingOptionListResponse>;
  };
  payment: {
    initiatePaymentSession(cart: HttpTypes.StoreCart, body: HttpTypes.StoreInitializePaymentSession, query?: { fields: string }): Promise<HttpTypes.StorePaymentCollectionResponse>;
  };
};

const CART_FIELDS = { fields: "+payment_collection.payment_sessions,*shipping_methods" };

export type CheckoutDetails = { email: string; phone: string; address: string; displayName?: string };
export type PaymentChannel = "card" | "mobile_money";
export type MobileMoneyDetails = { provider: "mtn" | "vod" | "atl"; phone: string };

export function createCheckoutService(sdk: CheckoutSdkBoundary) {
  const run = async <T>(operation: string, action: () => Promise<T>) => {
    try { return await action(); }
    catch (cause) { throw new MedusaCheckoutError(operation, cause instanceof Error ? cause.message : `Unable to ${operation}.`, cause); }
  };

  return {
    prepare: (cartId: string, details: CheckoutDetails) => run("prepare checkout", async () => {
      const [firstName, ...rest] = (details.displayName || "Guest Customer").trim().split(/\s+/);
      const { cart: addressed } = await sdk.cart.update(cartId, {
        email: details.email.trim(),
        shipping_address: { first_name: firstName, last_name: rest.join(" ") || "Customer", phone: details.phone.trim(), address_1: details.address.trim(), city: "Accra", country_code: "gh" },
      }, CART_FIELDS);
      const { shipping_options: options } = await sdk.fulfillment.listCartOptions({ cart_id: addressed.id });
      if (!options.length) throw new MedusaCheckoutError("select shipping", "No delivery option is configured for this Ghana cart.");
      const existing = addressed.shipping_methods?.[0];
      if (existing) return (await sdk.cart.retrieve(cartId, CART_FIELDS)).cart;
      return (await sdk.cart.addShippingMethod(cartId, { option_id: options[0].id }, CART_FIELDS)).cart;
    }),

    initiate: (cart: HttpTypes.StoreCart, channel: PaymentChannel, callbackUrl: string, mobileMoney?: MobileMoneyDetails) => run("initialize payment", async () => {
      const response = await sdk.payment.initiatePaymentSession(cart, {
        provider_id: PAYSTACK_PROVIDER_ID,
        data: { email: cart.email, channels: [channel], callback_url: callbackUrl, mobile_money: mobileMoney, metadata: { cart_id: cart.id, mobile_money: mobileMoney } },
      }, { fields: "*payment_sessions" });
      const session = response.payment_collection.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
      if (!session) throw new MedusaCheckoutError("initialize payment", "Medusa did not return the Paystack payment session.");
      if (session.data?.status === "send_otp") throw new MedusaCheckoutError("additional payment action", "This Paystack Mobile Money transaction requires OTP submission, which this provider does not support safely yet.");
      return { cart, session, accessCode: typeof session.data?.access_code === "string" ? session.data.access_code : null, authorizationUrl: typeof session.data?.authorization_url === "string" ? session.data.authorization_url : null };
    }),

    retrievePaymentState: (cartId: string) => run("verify payment", async () => {
      const { cart } = await sdk.cart.retrieve(cartId, CART_FIELDS);
      const session = cart.payment_collection?.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
      if (!session) throw new MedusaCheckoutError("verify payment", "The Paystack payment session was not found.");
      return session.status;
    }),

    waitUntilPaid: (cartId: string, options: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}) => run("verify payment", async () => {
      const attempts = options.attempts ?? 20;
      const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const { cart } = await sdk.cart.retrieve(cartId, CART_FIELDS);
        const session = cart.payment_collection?.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
        if (!session) throw new MedusaCheckoutError("verify payment", "The Paystack payment session was not found.");
        if (session.status === "authorized" || session.status === "captured") return session;
        if (session.status === "error" || session.status === "canceled") throw new MedusaCheckoutError("verify payment", `Payment is ${session.status}.`);
        if (attempt + 1 < attempts) await sleep(options.intervalMs ?? 1500);
      }
      throw new MedusaCheckoutError("verify payment", "Payment confirmation is still pending. You can safely resume checkout.");
    }),

    complete: (cartId: string) => run("complete cart", async () => {
      const { cart } = await sdk.cart.retrieve(cartId, CART_FIELDS);
      const session = cart.payment_collection?.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
      if (!session || (session.status !== "authorized" && session.status !== "captured")) throw new MedusaCheckoutError("complete cart", "Payment must be authorized before completing the cart.");
      const result = await sdk.cart.complete(cartId);
      if (result.type !== "order") throw new MedusaCheckoutError("complete cart", result.error.message);
      return result.order;
    }),
  };
}
