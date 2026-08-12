import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { ToastProvider } from "@/components/storefront/Toast";
import { CartProvider } from "@/lib/medusa/cart";
import { getAuthUser } from "@/lib/auth/session";

export async function AppShell({
  children,
  className = ""
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  const user = await getAuthUser();

  return (
    <CartProvider isSignedIn={Boolean(user)}>
      <ToastProvider>
        <main className={`marketplace ${className}`.trim()}>
          <StoreHeader />
          {children}
          <StoreFooter />
        </main>
      </ToastProvider>
    </CartProvider>
  );
}
