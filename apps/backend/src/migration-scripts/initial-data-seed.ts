import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";

const {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStoresWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} = require("@medusajs/medusa/core-flows");

const products = [
  {
    title: "Osu Linen Resort Shirt",
    handle: "osu-linen-resort-shirt",
    category: "Men",
    subcategory: "Shirts",
    collection: "Men's New Arrivals",
    description:
      "A breathable linen-blend shirt with a confident orange accent print for warm days and polished evenings.",
    sku: "SOB-M-SHIRT-OSU-LINEN",
    price: 185,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Orange", "Ivory", "Olive"],
    fit: "Regular",
    fabric: "Linen blend",
    gender: "Men",
    occasion: ["Casual", "Party"],
    brand: "Osu Studio",
    discountEligible: true,
    weight: 320,
    image:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Adinkra Pleated Midi Dress",
    handle: "adinkra-pleated-midi-dress",
    category: "Women",
    subcategory: "Dresses",
    collection: "Best Sellers",
    description:
      "A vibrant pleated midi dress with Adinkra-inspired patterning, a defined waist, and an easy event-ready drape.",
    sku: "SOB-W-DRESS-ADINKRA-MIDI",
    price: 290,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Orange", "Kente Multi", "Wine"],
    fit: "Tailored",
    fabric: "Viscose crepe",
    gender: "Women",
    occasion: ["Wedding", "Church", "Party"],
    brand: "Cocoa Stitch",
    discountEligible: true,
    weight: 480,
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Kumasi Tailored Kaftan",
    handle: "kumasi-tailored-kaftan",
    category: "Men",
    subcategory: "Kaftans and Traditional Wear",
    collection: "Traditional Wear",
    description:
      "A sharply finished kaftan with subtle embroidery, side pockets, and a formal neckline for church and ceremonies.",
    sku: "SOB-M-KAFTAN-KUMASI",
    price: 340,
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Ivory", "Navy", "Wine"],
    fit: "Tailored",
    fabric: "Cotton poplin",
    gender: "Men",
    occasion: ["Wedding", "Church"],
    brand: "Kente Lane",
    discountEligible: false,
    weight: 560,
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Accra Block Heel Sandal",
    handle: "accra-block-heel-sandal",
    category: "Women",
    subcategory: "Footwear",
    collection: "Weekend Sale",
    description:
      "A stable block heel sandal with cushioned sole support, clean straps, and a polished finish for events.",
    sku: "SOB-W-SHOE-ACCRA-HEEL",
    price: 220,
    sizes: ["36", "37", "38", "39", "40", "41", "42"],
    colors: ["Orange", "Black", "Sand"],
    fit: "Regular",
    fabric: "Leather",
    gender: "Women",
    occasion: ["Work", "Wedding", "Party"],
    brand: "Urban Ashanti",
    discountEligible: true,
    weight: 720,
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Tailored Work Trousers",
    handle: "tailored-work-trousers",
    category: "Men",
    subcategory: "Trousers",
    collection: "Under GH₵300",
    description:
      "Clean tapered trousers with reliable stretch, belt loops, and a crisp office-ready silhouette.",
    sku: "SOB-M-TROUSER-WORK",
    price: 210,
    sizes: ["32", "34", "36", "38", "40", "42", "44"],
    colors: ["Black", "Navy", "Sand"],
    fit: "Slim",
    fabric: "Cotton poplin",
    gender: "Men",
    occasion: ["Work", "Church"],
    brand: "Begnon Atelier",
    discountEligible: true,
    weight: 420,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Oversized Graphic T-Shirt",
    handle: "oversized-graphic-t-shirt",
    category: "Men",
    subcategory: "T-Shirts",
    collection: "Under GH₵200",
    description:
      "A heavyweight cotton tee with a strong chest graphic and relaxed streetwear volume.",
    sku: "SOB-M-TEE-GRAPHIC",
    price: 145,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Orange", "Ivory"],
    fit: "Oversized",
    fabric: "Cotton poplin",
    gender: "Men",
    occasion: ["Casual", "Party"],
    brand: "Urban Ashanti",
    discountEligible: true,
    weight: 260,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
  },
];

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  logger.info("Seeding Begnon sales channel and publishable key...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Begnon Storefront",
          description: "Primary Begnon online storefront.",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Begnon Storefront Publishable Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  logger.info("Seeding Begnon store, Ghana region, tax, and shipping...");
  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Begnon",
          supported_currencies: [
            {
              currency_code: "ghs",
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Ghana",
          currency_code: "ghs",
          countries: ["gh"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "gh",
        provider_id: "tp_system",
      },
    ],
  });

  const { result: stockLocationResult } =
    await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Accra Flagship",
            address: {
              city: "Accra",
              country_code: "GH",
              address_1: "Osu, Accra",
            },
          },
          {
            name: "Kumasi Branch",
            address: {
              city: "Kumasi",
              country_code: "GH",
              address_1: "Adum, Kumasi",
            },
          },
          {
            name: "Takoradi Warehouse",
            address: {
              city: "Takoradi",
              country_code: "GH",
              address_1: "Market Circle, Takoradi",
            },
          },
        ],
      },
    });
  for (const location of stockLocationResult) {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: location.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  }

  const {
    result: [shippingProfile],
  } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: "Begnon standard shipping",
          type: "default",
        },
      ],
    },
  });

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Begnon Ghana delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Ghana",
        geo_zones: [
          {
            country_code: "gh",
            type: "country",
          },
        ],
      },
    ],
  });

  for (const location of stockLocationResult) {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: location.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  }

  const { data: serviceZones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name"],
    filters: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });
  const serviceZone = serviceZones[0];

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Same-day Accra delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Same-day Accra",
          description: "Dispatch within Accra on the same business day.",
          code: "same_day_accra",
        },
        prices: [
          {
            currency_code: "ghs",
            amount: 35,
          },
          {
            region_id: region.id,
            amount: 35,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Nationwide dispatch",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Nationwide",
          description: "Courier delivery across Ghana.",
          code: "nationwide_dispatch",
        },
        prices: [
          {
            currency_code: "ghs",
            amount: 55,
          },
          {
            region_id: region.id,
            amount: 55,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  for (const location of stockLocationResult) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: location.id,
        add: [defaultSalesChannel.id],
      },
    });
  }

  logger.info("Seeding Begnon catalog...");
  const storefrontCategories = [
    "Men",
    "Women",
    "New Arrivals",
    "Best Sellers",
    "Sale",
    "Collections",
    "Shirts",
    "T-Shirts",
    "Polos",
    "Trousers",
    "Jeans",
    "Shorts",
    "Kaftans and Traditional Wear",
    "Suits and Formalwear",
    "Footwear",
    "Accessories",
    "Dresses",
    "Tops",
    "Skirts",
    "Traditional Wear",
  ];
  const variantValues = Array.from(
    new Set(
      products.flatMap((product) =>
        product.sizes.flatMap((size) =>
          product.colors.slice(0, 3).map((color) => `${size} / ${color}`)
        )
      )
    )
  );

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: storefrontCategories.map((name) => ({
        name,
        is_active: true,
      })),
    },
  });

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Variant",
          values: variantValues,
        },
      ],
    },
  });
  const variantOption = productOptionsResult.find(
    (option) => option.title === "Variant"
  )!;

  await createProductsWorkflow(container).run({
    input: {
      products: products.map((product) => ({
        title: product.title,
        category_ids: [
          categoryResult.find((category) => category.name === product.category)!
            .id,
          categoryResult.find(
            (category) => category.name === product.subcategory
          )!.id,
        ],
        description: product.description,
        handle: product.handle,
        weight: product.weight,
        status: "published",
        shipping_profile_id: shippingProfile.id,
        metadata: {
          collection: product.collection,
          fit: product.fit,
          fabric: product.fabric,
          gender: product.gender,
          occasion: product.occasion.join(", "),
          brand: product.brand,
          discount_eligible: product.discountEligible,
          low_stock_threshold: 5,
          stock_locations: "Accra Flagship, Kumasi Branch, Takoradi Warehouse",
          notification_channels: "sms, whatsapp, email",
        },
        images: [
          {
            url: product.image,
          },
        ],
        options: [{ id: variantOption.id }],
        variants: product.sizes.flatMap((size) =>
          product.colors.slice(0, 3).map((color, index) => ({
            title: `${size} / ${color}`,
            sku: `${product.sku}-${size}-${color}`
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "-"),
            options: {
              Variant: `${size} / ${color}`,
            },
            metadata: {
              size,
              color,
              fit: product.fit,
              fabric: product.fabric,
              low_stock_threshold: 5,
            },
            prices: [
              {
                amount: product.price + index * 5,
                currency_code: "ghs",
              },
            ],
          }))
        ),
        sales_channels: [
          {
            id: defaultSalesChannel.id,
          },
        ],
      })),
    },
  });

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.flatMap((item, index) =>
        stockLocationResult.map((location, locationIndex) => ({
          location_id: location.id,
          stocked_quantity: Math.max(8, 48 - index * 2 - locationIndex * 5),
          inventory_item_id: item.id,
        }))
      ),
    },
  });

  logger.info(
    `Begnon seed complete. Publishable key: ${publishableApiKey.token}`
  );
}
