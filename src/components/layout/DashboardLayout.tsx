import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileHeader />
      <div className="lg:ml-64">
        <div className="hidden lg:block">
          <Header />
        </div>
        <main className="p-4 lg:p-6 pt-20 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}