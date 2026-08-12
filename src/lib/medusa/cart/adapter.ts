import type { HttpTypes } from "@medusajs/types";
import type { CartItem, CartResponse } from "@/lib/utils/cart";
import { MedusaCartContractError } from "./errors";

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new MedusaCartContractError(field);
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new MedusaCartContractError(field);
  return value;
}

export function mapMedusaCart(cart: HttpTypes.StoreCart): CartResponse {
  const id = requiredString(cart.id, "cart.id");
  if (!Array.isArray(cart.items)) throw new MedusaCartContractError("cart.items");
  const items = cart.items.map((line, index): CartItem => {
    const prefix = `cart.items[${index}]`;
    const product = line.product;
    const variant = line.variant;
    return {
      id: requiredString(line.id, `${prefix}.id`),
      variantId: requiredString(line.variant_id, `${prefix}.variant_id`),
      productId: requiredString(product?.id ?? variant?.product_id, `${prefix}.product.id`),
      slug: requiredString(product?.handle, `${prefix}.product.handle`),
      name: requiredString(product?.title ?? line.title, `${prefix}.product.title`),
      image: requiredString(line.thumbnail ?? product?.thumbnail, `${prefix}.thumbnail`),
      price: requiredNumber(line.unit_price, `${prefix}.unit_price`),
      size: String(variant?.options?.find((option) => option.option?.title?.toLowerCase() === "size")?.value ?? ""),
      color: String(variant?.options?.find((option) => option.option?.title?.toLowerCase() === "color")?.value ?? ""),
      quantity: requiredNumber(line.quantity, `${prefix}.quantity`),
      lineTotal: requiredNumber(line.total, `${prefix}.total`),
    };
  });

  const promoCodes = Array.isArray(cart.promotions)
    ? cart.promotions.map((promotion) => promotion.code).filter((code): code is string => Boolean(code))
    : [];

  return {
    id,
    items,
    promoCodes,
    totals: {
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: requiredNumber(cart.subtotal, "cart.subtotal"),
      shipping: requiredNumber(cart.shipping_total, "cart.shipping_total"),
      // Unlike the fields above, a cart legitimately has no discount applied
      // most of the time - default to 0 instead of treating it as a contract
      // violation the way a missing subtotal/shipping/total would be.
      discount: typeof cart.discount_total === "number" && Number.isFinite(cart.discount_total) ? cart.discount_total : 0,
      total: requiredNumber(cart.total, "cart.total"),
    },
  };
}
