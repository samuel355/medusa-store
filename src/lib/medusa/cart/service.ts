import type { HttpTypes } from "@medusajs/types";
import type { CartResponse } from "@/lib/utils/cart";
import { mapMedusaCart } from "./adapter";
import { MedusaCartContractError, MedusaCartOperationError } from "./errors";

const CART_QUERY = { fields: "*items,*items.product,*items.variant,*items.variant.options,*items.variant.options.option" };

export type CartSdkBoundary = {
  create(body: HttpTypes.StoreCreateCart, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
  retrieve(id: string, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
  createLineItem(id: string, body: HttpTypes.StoreAddCartLineItem, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
  updateLineItem(id: string, lineId: string, body: HttpTypes.StoreUpdateCartLineItem, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
  deleteLineItem(id: string, lineId: string, query?: { fields: string }): Promise<HttpTypes.StoreLineItemDeleteResponse>;
  addPromotions(id: string, body: HttpTypes.StoreCartAddPromotion, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
  removePromotions(id: string, body: HttpTypes.StoreCartRemovePromotion, query?: { fields: string }): Promise<HttpTypes.StoreCartResponse>;
};

export function createCartService(sdk: CartSdkBoundary, regionId: string) {
  async function run(operation: string, action: () => Promise<HttpTypes.StoreCartResponse>): Promise<CartResponse> {
    try {
      return mapMedusaCart((await action()).cart);
    } catch (cause) {
      if (cause instanceof MedusaCartContractError || cause instanceof MedusaCartOperationError) throw cause;
      throw new MedusaCartOperationError(operation, cause);
    }
  }

  return {
    create: () => run("create", () => sdk.create({ region_id: regionId }, CART_QUERY)),
    retrieve: (id: string) => run("retrieve", () => sdk.retrieve(id, CART_QUERY)),
    add: (id: string, variantId: string, quantity: number) =>
      run("add line item", () => sdk.createLineItem(id, { variant_id: variantId, quantity }, CART_QUERY)),
    update: (id: string, lineId: string, quantity: number) =>
      run("update line item", () => sdk.updateLineItem(id, lineId, { quantity }, CART_QUERY)),
    remove: async (id: string, lineId: string) => {
      try {
        const response = await sdk.deleteLineItem(id, lineId, CART_QUERY);
        if (!response.parent) throw new Error("Medusa did not return the updated cart");
        return mapMedusaCart(response.parent);
      } catch (cause) {
        if (cause instanceof MedusaCartContractError) throw cause;
        throw new MedusaCartOperationError("remove line item", cause);
      }
    },
    applyDiscount: async (id: string, code: string) => {
      const cart = await run("apply discount code", () => sdk.addPromotions(id, { promo_codes: [code] }, CART_QUERY));
      // Medusa returns 200 even for a code it didn't actually apply (unknown,
      // expired, or not valid for this cart) - the only reliable signal is
      // whether the code shows up in the cart's promotions afterward. Checked
      // outside the try/catch above so this becomes a clear, expected message
      // instead of a generic wrapped operation error.
      const applied = cart.promoCodes.some((existing) => existing.toLowerCase() === code.trim().toLowerCase());
      if (!applied) throw new Error("That code isn't valid or doesn't apply to your order.");
      return cart;
    },
    removeDiscount: (id: string, code: string) =>
      run("remove discount code", () => sdk.removePromotions(id, { promo_codes: [code] }, CART_QUERY)),
  };
}
