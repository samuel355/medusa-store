import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";

export function AppShell({
  children,
  className = ""
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <main className={`marketplace ${className}`.trim()}>
      <StoreHeader />
      {children}
      <StoreFooter />
    </main>
  );
}
