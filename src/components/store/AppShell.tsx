import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { ToastProvider } from "@/components/storefront/Toast";
import { CartProvider } from "@/lib/medusa/cart";

export function AppShell({
  children,
  className = ""
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <CartProvider>
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
