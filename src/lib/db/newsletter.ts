import { getSql } from "@/lib/db/client";

export type NewsletterSubscribeResult = { ok: true } | { ok: false; error: string };

export async function subscribeToNewsletter(email: string, source = "footer"): Promise<NewsletterSubscribeResult> {
  const sql = getSql();

  try {
    // Re-subscribing (e.g. after a prior unsubscribe) just clears the flag
    // rather than erroring on the unique email constraint.
    await sql`
      insert into begnon.newsletter_subscribers (email, source)
      values (${email}, ${source})
      on conflict (email) do update set unsubscribed_at = null
    `;
    return { ok: true };
  } catch (cause) {
    console.error("subscribeToNewsletter failed", cause);
    return { ok: false, error: "Unable to subscribe right now. Please try again." };
  }
}
