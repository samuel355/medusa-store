import { AppShell } from "@/components/store/AppShell";
import { CustomerDashboardShell } from "@/components/storefront/CustomerDashboardShell";

export default function CustomersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell className="app-page">
      <CustomerDashboardShell>{children}</CustomerDashboardShell>
    </AppShell>
  );
}
