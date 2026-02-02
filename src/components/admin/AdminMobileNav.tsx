import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu,
  LayoutDashboard, 
  Users, 
  TrendingUp,
  UserCheck, 
  Receipt, 
  MessageSquare, 
  Settings,
  DollarSign,
  LogOut,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

interface AdminMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats?: {
    pendingKYC: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'traders', label: 'Traders', icon: TrendingUp },
  { id: 'investment-plans', label: 'Investment Plans', icon: DollarSign },
  { id: 'signals', label: 'Signals', icon: TrendingUp },
  { id: 'kyc', label: 'KYC Requests', icon: UserCheck, badge: 'pendingKYC' },
  { id: 'transactions', label: 'Transactions', icon: Receipt, badge: 'pendingTransactions' },
  { id: 'notifications', label: 'Notifications', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AdminMobileNav({ activeTab, onTabChange, stats }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  const handleBackToSite = () => {
    navigate('/dashboard');
    setOpen(false);
  };

  const getPendingCount = (badgeKey: string): number => {
    if (!stats) return 0;
    if (badgeKey === 'pendingKYC') return stats.pendingKYC || 0;
    if (badgeKey === 'pendingTransactions') return (stats.pendingDeposits || 0) + (stats.pendingWithdrawals || 0);
    return 0;
  };

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Green Bull" className="h-8 w-8" />
          <div>
            <h1 className="font-bold text-sm">Green Bull</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-card border-border p-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                <img src={logo} alt="Green Bull" className="h-10 w-10" />
                <div>
                  <h1 className="font-bold">Green Bull</h1>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>

              {/* User Info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const badgeCount = item.badge ? getPendingCount(item.badge) : 0;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </div>
                      {badgeCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {badgeCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Footer Actions */}
              <div className="border-t border-border p-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleBackToSite}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Back to Site
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
