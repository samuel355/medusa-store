import assert from "node:assert/strict";
import test from "node:test";
import type { HttpTypes } from "@medusajs/types";

import { MedusaCatalogueContractError } from "./errors";
import { mapMedusaCategory, mapMedusaProduct } from "./mapper";

function productFixture(): HttpTypes.StoreProduct {
  return {
    id: "prod_1",
    title: "Linen Shirt",
    handle: "linen-shirt",
    description: "Breathable shirt",
    status: "published",
    thumbnail: "https://example.com/thumb.jpg",
    weight: 320,
    created_at: new Date().toISOString(),
    metadata: {
      collection: "New Arrivals",
      fit: "Regular",
      fabric: "Linen",
      gender: "Men",
      occasion: "Casual, Work",
      brand: "Begnon",
      discount_eligible: true,
      sold_count: 7,
      rating: 4.5,
    },
    categories: [{ id: "pcat_1", name: "Men", handle: "men" } as HttpTypes.StoreProductCategory],
    images: [{ id: "img_1", url: "https://example.com/shirt.jpg" } as HttpTypes.StoreProductImage],
    variants: [{
      id: "variant_1",
      sku: "SHIRT-M-BLUE",
      manage_inventory: true,
      inventory_quantity: 8,
      weight: 310,
      metadata: { size: "M", color: "Blue" },
      calculated_price: { calculated_amount: 185, original_amount: 220 },
    } as unknown as HttpTypes.StoreProductVariant],
  } as unknown as HttpTypes.StoreProduct;
}

test("maps a Medusa product to the existing storefront contract", () => {
  const product = mapMedusaProduct(productFixture());
  assert.equal(product.variantId, "variant_1");
  assert.equal(product.slug, "linen-shirt");
  assert.equal(product.price, 185);
  assert.equal(product.oldPrice, 220);
  assert.equal(product.category, "Men");
  assert.deepEqual(product.sizes, ["M"]);
  assert.deepEqual(product.colors, ["Blue"]);
  assert.equal(product.stock, "In stock");
  assert.equal(product.discountEligible, true);
  assert.deepEqual(product.occasion, ["Casual", "Work"]);
});

test("selects the storefront category independently of API category order", () => {
  const fixture = productFixture();
  const men = { id: "pcat_men", name: "Men", handle: "men", parent_category_id: null } as unknown as HttpTypes.StoreProductCategory;
  const shirts = { id: "pcat_shirts", name: "Shirts", handle: "shirts", parent_category_id: "pcat_men" } as unknown as HttpTypes.StoreProductCategory;

  fixture.categories = [shirts, men];
  const reversed = mapMedusaProduct(fixture);
  fixture.categories = [men, shirts];
  const original = mapMedusaProduct(fixture);

  assert.equal(reversed.categoryId, "pcat_men");
  assert.equal(reversed.category, "Men");
  assert.equal(reversed.subcategory, "Shirts");
  assert.deepEqual(
    { categoryId: reversed.categoryId, category: reversed.category, subcategory: reversed.subcategory },
    { categoryId: original.categoryId, category: original.category, subcategory: original.subcategory },
  );
});

test("maps category metadata without changing the page contract", () => {
  const category = mapMedusaCategory({
    id: "pcat_1",
    name: "Men",
    handle: "men",
    description: "Menswear",
    metadata: { image_url: "https://example.com/men.jpg" },
  } as unknown as HttpTypes.StoreProductCategory);
  assert.deepEqual(category, {
    id: "pcat_1",
    name: "Men",
    slug: "men",
    description: "Menswear",
    imageUrl: "https://example.com/men.jpg",
  });
});

test("fails with a typed contract error when a required product field is missing", () => {
  const fixture = productFixture();
  fixture.handle = "";
  assert.throws(
    () => mapMedusaProduct(fixture),
    (error) => error instanceof MedusaCatalogueContractError && error.field === "product(prod_1).handle",
  );
});

test("fails with a typed contract error when a product has no purchasable variant", () => {
  const fixture = productFixture();
  fixture.variants = [];
  assert.throws(() => mapMedusaProduct(fixture), MedusaCatalogueContractError);
});
