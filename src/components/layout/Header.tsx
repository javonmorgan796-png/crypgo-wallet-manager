import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockUser } from '@/data/mockData';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-10 bg-secondary border-border focus:ring-primary"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
        </Button>

        {/* Balance */}
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-semibold text-foreground">
              ${mockUser.balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <img
            src={mockUser.avatar}
            alt={mockUser.name}
            className="h-10 w-10 rounded-full border-2 border-primary"
          />
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{mockUser.name}</p>
            <p className="text-xs text-muted-foreground">{mockUser.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}