import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { mockUser } from '@/data/mockData';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

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
  const livePrices = useLivePrices();

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
        <NotificationsDropdown />

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
