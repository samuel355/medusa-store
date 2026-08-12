import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/db/newsletter";
import { isValidEmail } from "@/lib/utils/validation";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";

export async function POST(request: Request) {
  const limit = rateLimit(`newsletter:${clientIp(request)}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = await subscribeToNewsletter(email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ subscribed: true });
}
