import type { HttpTypes } from "@medusajs/types";

import { MedusaIntegrationError } from "./errors";
import { medusaConfig, medusaSdk } from "./sdk";

export async function checkMedusaConnectivity(): Promise<HttpTypes.StoreRegion> {
  const operation = `retrieve region ${medusaConfig.regionId}`;

  try {
    const { region } = await medusaSdk.store.region.retrieve(
      medusaConfig.regionId,
      { fields: "id,name,currency_code" },
    );

    return region;
  } catch (cause) {
    throw new MedusaIntegrationError(operation, cause);
  }
}
