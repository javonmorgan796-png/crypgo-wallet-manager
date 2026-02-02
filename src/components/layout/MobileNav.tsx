import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  History, 
  Settings, 
  LogOut,
  Wallet,
  Menu,
  Gift,
  Shield,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

const navItems = [
  { icon: Wallet, label: 'Wallet', href: '/wallet' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: TrendingUp, label: 'Investments', href: '/investments' },
  { icon: Users, label: 'Copy Trade', href: '/copy-trade' },
  { icon: Activity, label: 'Signals', href: '/signals' },
  { icon: History, label: 'Transactions', href: '/transactions' },
  { icon: Gift, label: 'Referral', href: '/referral' },
  { icon: Shield, label: 'KYC Verification', href: '/kyc' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar border-border p-0">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Green Bull" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-display text-xl font-bold text-foreground">Green Bull</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            
            {/* Admin Panel Link - Only visible for admins */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                  location.pathname === '/admin'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-400'
                )}
              >
                <ShieldCheck className="h-5 w-5" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-4">
            <Link
              to="/"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
