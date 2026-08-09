import crypto from "node:crypto";
import { Medusa, medusaConfig } from "@/lib/medusa/sdk";
import { setMedusaCustomerId, type Customer } from "@/lib/db/customers";
import { readEnv } from "@/lib/env";

// A throwaway client per call, never the shared `medusaSdk` singleton - that
// instance is reused across concurrent requests for different visitors, so
// storing one customer's JWT on it would leak the token across requests.
function createLinkClient() {
  return new Medusa({
    baseUrl: medusaConfig.backendUrl,
    publishableKey: medusaConfig.publishableKey,
    auth: { type: "jwt", jwtTokenStorageMethod: "memory" },
  });
}

// Deterministic, not stored: recomputing this is how we log back into a
// customer's Medusa account on demand, instead of persisting/refreshing a
// password or long-lived token anywhere.
function deriveMedusaPassword(customerId: string): string {
  const secret = readEnv("MEDUSA_CUSTOMER_LINK_SECRET");
  return crypto.createHmac("sha256", secret).update(customerId).digest("hex");
}

// Medusa's emailpass provider requires an email even for phone-only
// customers - mirrors the synthetic-email pattern phoneSession.ts already
// uses for Supabase, so phone-only sign-ins still get real order history.
// This is purely an internal identity handle; real order confirmation
// emails come from the address entered at checkout, not this one.
function medusaLinkEmail(customer: Customer): string {
  return customer.email || `customer-${customer.id}@medusa-link.begnon.internal`;
}

// Best-effort end to end: a Medusa outage, or a misconfigured secret, must
// never block Supabase sign-in or guest checkout, so every failure here -
// including a missing env var - is caught and logged rather than thrown.
export async function ensureMedusaCustomerLink(customer: Customer): Promise<string | null> {
  if (customer.medusaCustomerId) return customer.medusaCustomerId;

  const email = medusaLinkEmail(customer);

  try {
    const password = deriveMedusaPassword(customer.id);

    try {
      const client = createLinkClient();
      await client.auth.register("customer", "emailpass", { email, password });
      const { customer: medusaCustomer } = await client.store.customer.create({
        email,
        first_name: customer.firstName || undefined,
        last_name: customer.lastName || undefined,
      });
      await setMedusaCustomerId(customer.id, medusaCustomer.id);
      return medusaCustomer.id;
    } catch {
      // Registration fails if this email already has a Medusa auth identity
      // (e.g. linking retried after a partial earlier failure) - fall back
      // to logging in with the same derived password to find the link.
      const client = createLinkClient();
      await client.auth.login("customer", "emailpass", { email, password });
      const { customer: medusaCustomer } = await client.store.customer.retrieve();
      await setMedusaCustomerId(customer.id, medusaCustomer.id);
      return medusaCustomer.id;
    }
  } catch (cause) {
    console.error("ensureMedusaCustomerLink failed", cause);
    return null;
  }
}

export async function getMedusaCustomerToken(customer: Customer): Promise<string | null> {
  try {
    const linked = await ensureMedusaCustomerLink(customer);
    if (!linked) return null;

    const client = createLinkClient();
    const password = deriveMedusaPassword(customer.id);
    const token = await client.auth.login("customer", "emailpass", { email: medusaLinkEmail(customer), password });
    return typeof token === "string" ? token : null;
  } catch (cause) {
    console.error("getMedusaCustomerToken failed", cause);
    return null;
  }
}
