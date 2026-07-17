import { NextResponse } from "next/server";
import { getCustomerByAuthUserId, updateCustomerProfile } from "@/lib/db/customers";
import { getAuthUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const customer = await getCustomerByAuthUserId(user.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const customer = await getCustomerByAuthUserId(user.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
  }

  const body = (await request.json()) as Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    phone: string;
    email: string;
  }>;

  const updated = await updateCustomerProfile(customer.id, body);
  return NextResponse.json({ customer: updated });
}
