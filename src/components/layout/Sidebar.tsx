import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  History, 
  Settings, 
  LogOut,
  Wallet,
  Gift,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

const navItems = [
  { icon: Wallet, label: 'Wallet', href: '/wallet' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: TrendingUp, label: 'Investments', href: '/investments' },
  { icon: Users, label: 'Copy Trade', href: '/copy-trade' },
  { icon: History, label: 'Transactions', href: '/transactions' },
  { icon: Gift, label: 'Referral', href: '/referral' },
  { icon: Shield, label: 'KYC Verification', href: '/kyc' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar hidden lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <img src={logo} alt="Green Bull" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-xl font-bold text-foreground">Green Bull</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
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
    </aside>
  );
}
