import { NextResponse } from "next/server";
import { resolveCustomer } from "@/lib/auth/session";
import { getMedusaCustomerToken } from "@/lib/medusa/customerIdentity";
import { listMedusaOrdersForCustomer } from "@/lib/medusa/orders";

export async function GET() {
  const customer = await resolveCustomer();
  if (!customer) {
    return NextResponse.json({ orders: [] });
  }

  const token = await getMedusaCustomerToken(customer);
  if (!token) {
    return NextResponse.json({ orders: [] });
  }

  try {
    return NextResponse.json({ orders: await listMedusaOrdersForCustomer(token) });
  } catch (cause) {
    console.error("list customer orders failed", cause);
    return NextResponse.json({ orders: [] });
  }
}
