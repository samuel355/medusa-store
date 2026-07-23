import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHero } from "@/components/store/AppHero";
import { AppShell } from "@/components/store/AppShell";
import { CheckoutFlow } from "@/components/storefront/CheckoutFlow";
import { MedusaCheckoutLoader } from "@/components/storefront/MedusaCheckoutLoader";
import { getActiveCart, getCartWithItems } from "@/lib/db/cart";
import { getAuthUser } from "@/lib/auth/session";
import { getCustomerByAuthUserId } from "@/lib/db/customers";
import { isMedusaCartEnabled } from "@/lib/medusa/cart/config";

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("begnon_cart_id")?.value;

  const user = await getAuthUser();
  const customer = user ? await getCustomerByAuthUserId(user.id) : null;

  const medusaEnabled = isMedusaCartEnabled();
  const resolvedCartId = !medusaEnabled && (cartId || customer) ? await getActiveCart(cartId, customer?.id) : null;
  const cart = resolvedCartId ? await getCartWithItems(resolvedCartId) : null;

  if (!medusaEnabled && (!cart || cart.items.length === 0)) {
    redirect("/cart");
  }

  return (
    <AppShell className="app-page checkout-page">
      <AppHero
        kicker="Checkout"
        title="Almost there."
        description="Confirm your details and choose Mobile Money or card to complete your order."
      />
      {medusaEnabled ? <MedusaCheckoutLoader isSignedIn={Boolean(user)} customer={customer ? { displayName: customer.displayName, email: customer.email, phone: customer.phone } : null} /> : <CheckoutFlow
        cart={cart!}
        isSignedIn={Boolean(user)}
        customer={
          customer
            ? { displayName: customer.displayName, email: customer.email, phone: customer.phone }
            : null
        }
      />}
    </AppShell>
  );
}
