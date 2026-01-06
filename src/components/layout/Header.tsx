import { useState, useEffect } from 'react';
import { Bell, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockUser } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const mockNotifications = [
  {
    id: '1',
    title: 'Deposit Confirmed',
    message: 'Your deposit of $5,000 has been confirmed.',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Investment Matured',
    message: 'Your Gold Plan investment has matured with 30% ROI.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    title: 'Copy Trade Profit',
    message: 'You earned $340 from Sarah Chen\'s trade.',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '4',
    title: 'Welcome Bonus',
    message: 'You received a $50 welcome bonus!',
    time: '1 day ago',
    read: true,
  },
];

// Live crypto prices with auto-refresh
const useLivePrices = () => {
  const [prices, setPrices] = useState([
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.80, change24h: 2.34, icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', price: 2280.45, change24h: 1.87, icon: 'Ξ' },
    { symbol: 'BNB', name: 'BNB', price: 312.20, change24h: -0.54, icon: '⬡' },
    { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.21, icon: '◎' },
    { symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.01, icon: '₮' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prevPrices => 
        prevPrices.map(crypto => ({
          ...crypto,
          price: crypto.symbol === 'USDT' 
            ? 1.00 
            : crypto.price * (1 + (Math.random() - 0.5) * 0.002),
          change24h: crypto.symbol === 'USDT'
            ? 0.01
            : crypto.change24h + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return prices;
};

export function Header() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter(n => !n.read).length;
  const livePrices = useLivePrices();

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      {/* Live Prices Ticker */}
      <div className="hidden md:flex items-center gap-4 overflow-hidden">
        {livePrices.slice(0, 4).map((crypto) => (
          <div key={crypto.symbol} className="flex items-center gap-2 text-sm">
            <span className="text-lg">{crypto.icon}</span>
            <span className="font-medium text-foreground">{crypto.symbol}</span>
            <span className="text-muted-foreground transition-all duration-300">
              ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`flex items-center gap-0.5 transition-all duration-300 ${crypto.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {crypto.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
            </span>
          </div>
        ))}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-card border-border">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-foreground">{notification.title}</span>
                    {!notification.read && (
                      <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{notification.message}</span>
                  <span className="text-xs text-muted-foreground">{notification.time}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
