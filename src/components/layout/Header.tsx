import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { BalanceDisplay } from '@/components/ui/BalanceDisplay';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Welcome Message */}
      <div className="hidden md:block">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <p className="font-semibold text-foreground">{user?.name || 'User'}</p>
      </div>

      {/* Search - Mobile */}
      <div className="relative w-48 md:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-10 bg-secondary border-border focus:ring-primary"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* Balance with visibility toggle */}
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <BalanceDisplay balance={user?.balance || 0} />
          </div>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
            alt={user?.name || 'User'}
            className="h-10 w-10 rounded-full border-2 border-primary"
          />
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
