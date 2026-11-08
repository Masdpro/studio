import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { VerificationBanner } from '@/components/account/VerificationBanner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8">
          <VerificationBanner />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
