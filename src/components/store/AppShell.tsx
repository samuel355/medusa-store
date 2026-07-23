import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
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
      <main className={`marketplace ${className}`.trim()}>
        <StoreHeader />
        {children}
        <StoreFooter />
      </main>
    </CartProvider>
  );
}
