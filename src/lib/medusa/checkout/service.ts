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
    listCartOptions(query: { cart_id: string; fields?: string }): Promise<HttpTypes.StoreShippingOptionListResponse>;
  };
  payment: {
    initiatePaymentSession(cart: HttpTypes.StoreCart, body: HttpTypes.StoreInitializePaymentSession, query?: { fields: string }): Promise<HttpTypes.StorePaymentCollectionResponse>;
  };
  client: {
    fetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T>;
  };
};

const CART_FIELDS = { fields: "+payment_collection.payment_sessions,*shipping_methods" };

export type CheckoutDetails = { email: string; phone: string; address: string; city: string; displayName: string };

// Matches the shipping option `type.code` values seeded in
// initial-data-seed.ts - same-day delivery only makes sense inside Accra,
// everywhere else in Ghana gets the flatter nationwide courier rate. Falls
// back to whatever Medusa returns first if neither code is configured (e.g.
// a store with only one shipping option), so this never blocks checkout.
// Exported so the checkout UI can preview the fee for the selected city
// before prepare() actually attaches a shipping method to the cart.
export function pickShippingOption(options: HttpTypes.StoreCartShippingOptionWithServiceZone[], city: string): HttpTypes.StoreCartShippingOptionWithServiceZone {
  const isAccra = /^accra$/i.test(city.trim());
  const wantedCode = isAccra ? "same_day_accra" : "nationwide_dispatch";
  return options.find((option) => option.type?.code === wantedCode) ?? options[0];
}
export type PaymentChannel = "card" | "mobile_money";
export type MobileMoneyDetails = { provider: "mtn" | "vod" | "atl"; phone: string };

export function createCheckoutService(sdk: CheckoutSdkBoundary) {
  const run = async <T>(operation: string, action: () => Promise<T>) => {
    try { return await action(); }
    catch (cause) { throw new MedusaCheckoutError(operation, cause instanceof Error ? cause.message : `Unable to ${operation}.`, cause); }
  };

  return {
    prepare: (cartId: string, details: CheckoutDetails) => run("prepare checkout", async () => {
      // The UI requires a full name before checkout can be submitted at all -
      // this fallback only guards against a caller bypassing that (e.g. a
      // future integration), not the normal path.
      const [firstName, ...rest] = (details.displayName.trim() || "Guest Customer").split(/\s+/);
      const city = details.city.trim() || "Accra";
      const { cart: addressed } = await sdk.cart.update(cartId, {
        email: details.email.trim(),
        shipping_address: { first_name: firstName, last_name: rest.join(" ") || "Customer", phone: details.phone.trim(), address_1: details.address.trim(), city, country_code: "gh" },
      }, CART_FIELDS);
      // The store API's default field set for shipping options omits the
      // `type` relation entirely (only the raw shipping_option_type_id FK) -
      // without this, option.type is always undefined and pickShippingOption
      // silently falls back to options[0] every time, regardless of city.
      const { shipping_options: options } = await sdk.fulfillment.listCartOptions({ cart_id: addressed.id, fields: "+type.code" });
      if (!options.length) throw new MedusaCheckoutError("select shipping", "No delivery option is configured for this Ghana cart.");
      const option = pickShippingOption(options, city);
      const existing = addressed.shipping_methods?.[0];
      if (existing?.shipping_option_id === option.id) return (await sdk.cart.retrieve(cartId, CART_FIELDS)).cart;
      return (await sdk.cart.addShippingMethod(cartId, { option_id: option.id }, CART_FIELDS)).cart;
    }),

    initiate: (cart: HttpTypes.StoreCart, channel: PaymentChannel, callbackUrl: string, mobileMoney?: MobileMoneyDetails) => run("initialize payment", async () => {
      const response = await sdk.payment.initiatePaymentSession(cart, {
        provider_id: PAYSTACK_PROVIDER_ID,
        data: { email: cart.email, channels: [channel], callback_url: callbackUrl, mobile_money: mobileMoney, metadata: { cart_id: cart.id, mobile_money: mobileMoney } },
      }, { fields: "*payment_sessions" });
      const session = response.payment_collection.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
      if (!session) throw new MedusaCheckoutError("initialize payment", "Medusa did not return the Paystack payment session.");
      const data = session.data ?? {};
      // Card (or any request that isn't mobile-money-only) always goes through
      // Standard Checkout, which returns an access code/authorization URL for
      // Paystack's own popup/hosted page - card details never touch this
      // storefront. Mobile money with a network + number goes through Direct
      // Charge instead (see paystack-payment/service.ts's initiatePayment),
      // which returns a synchronous status ("send_otp"/"pending"/"success"/...)
      // and never opens a popup at all.
      return {
        cart, session,
        accessCode: typeof data.access_code === "string" ? data.access_code : null,
        authorizationUrl: typeof data.authorization_url === "string" ? data.authorization_url : null,
        chargeStatus: typeof data.status === "string" ? data.status : null,
        chargeReference: typeof data.reference === "string" ? data.reference : null,
        displayText: typeof data.display_text === "string" ? data.display_text : null,
      };
    }),

    // Completes a mobile money Direct Charge after Paystack texts the
    // customer an OTP (session.chargeStatus === "send_otp" from initiate()
    // above). This only resolves the *payment session* at Paystack - the
    // caller still must call complete()/waitUntilPaid(), which live-verifies
    // the transaction via Medusa's own authorizePaymentSessionStep rather
    // than trusting this response, so a forged/guessed OTP can only fail or
    // succeed the charge already tied to that reference, never fabricate an
    // order on its own.
    submitMobileMoneyOtp: (otp: string, reference: string) => run("submit otp", () =>
      sdk.client.fetch<{ status: string; reference: string; displayText?: string }>("/store/paystack/submit-otp", {
        method: "POST",
        body: { otp, reference },
      })),

    retrievePaymentState: (cartId: string) => run("verify payment", async () => {
      const { cart } = await sdk.cart.retrieve(cartId, CART_FIELDS);
      const session = cart.payment_collection?.payment_sessions?.find((candidate) => candidate.provider_id === PAYSTACK_PROVIDER_ID);
      if (!session) throw new MedusaCheckoutError("verify payment", "The Paystack payment session was not found.");
      return session.status;
    }),

    // Medusa's complete-cart workflow authorizes the payment session itself — it calls the
    // Paystack provider, which live-verifies the transaction directly with Paystack's API
    // (GET /transaction/verify). It does not depend on Paystack's webhook having already
    // updated the cart's local session status, so this retries `sdk.cart.complete` itself
    // rather than polling `cart.retrieve` for a status a webhook might never deliver locally.
    // completeCartWorkflow is documented as idempotent, so retrying (and the follow-up
    // `complete` call below) is safe and returns the same order.
    waitUntilPaid: (cartId: string, options: { attempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}) => run("verify payment", async () => {
      const attempts = options.attempts ?? 5;
      const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
      let lastError: unknown;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await sdk.cart.complete(cartId);
          if (result.type === "order") return result;
          lastError = new Error(result.error.message);
        } catch (cause) {
          lastError = cause;
        }
        if (attempt + 1 < attempts) await sleep(options.intervalMs ?? 1500);
      }
      throw lastError instanceof Error ? lastError : new Error("Payment confirmation is still pending. You can safely resume checkout.");
    }),

    complete: (cartId: string) => run("complete cart", async () => {
      const result = await sdk.cart.complete(cartId);
      if (result.type !== "order") throw new MedusaCheckoutError("complete cart", result.error.message);
      return result.order;
    }),
  };
}
