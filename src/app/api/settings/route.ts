import { NextResponse } from "next/server";
import { getCustomerSettings, updateCustomerSettings, type CustomerSettings } from "@/lib/db/settings";
import { requireCustomerId } from "@/lib/auth/session";

export async function GET() {
  try {
    const customerId = await requireCustomerId();
    return NextResponse.json(await getCustomerSettings(customerId));
  } catch {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<CustomerSettings>;

  try {
    const customerId = await requireCustomerId();
    await updateCustomerSettings(customerId, body);
    return NextResponse.json(await getCustomerSettings(customerId));
  } catch {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
}
