import { NextResponse } from "next/server";
import { resolveCustomer } from "@/lib/auth/session";
import { getMedusaCustomerToken } from "@/lib/medusa/customerIdentity";
import { medusaSdk } from "@/lib/medusa/sdk";

export async function POST(request: Request) {
  const customer = await resolveCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    productId?: string;
    orderId?: string;
    orderItemId?: string;
    rating?: number;
    reviewBody?: string;
  } | null;

  if (!body?.productId || !body.orderId || !body.orderItemId || !body.rating || !body.reviewBody) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const token = await getMedusaCustomerToken(customer);
  if (!token) {
    return NextResponse.json({ error: "Unable to verify your account. Please try again." }, { status: 401 });
  }

  try {
    const result = await medusaSdk.client.fetch<{ review: unknown }>("/store/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        productId: body.productId,
        orderId: body.orderId,
        orderItemId: body.orderItemId,
        rating: body.rating,
        reviewBody: body.reviewBody,
        customerName: customer.displayName,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (cause) {
    const status = (cause as { status?: number })?.status ?? 400;
    const message = (cause as { message?: string })?.message ?? "Unable to submit review.";
    return NextResponse.json({ error: message }, { status });
  }
}
