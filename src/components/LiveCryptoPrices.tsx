import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { useWebSocketPrices } from '@/hooks/useWebSocketPrices';
import { cn } from '@/lib/utils';

interface LiveCryptoPricesProps {
  compact?: boolean;
  showStatus?: boolean;
}

export function LiveCryptoPrices({ compact = false, showStatus = false }: LiveCryptoPricesProps) {
  const { prices, isConnected, isConnecting } = useWebSocketPrices();

  const cryptoIcons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    BNB: '⬡',
    SOL: '◎',
    USDT: '₮',
    XRP: '✕',
    ADA: '₳',
    DOGE: 'Ð',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 overflow-hidden">
        {showStatus && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isConnected ? "text-primary" : isConnecting ? "text-amber-500" : "text-destructive"
          )}>
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}
            </span>
          </div>
        )}
        {prices.slice(0, 4).map((crypto) => (
          <div key={crypto.symbol} className="flex items-center gap-2 text-sm">
            <span className="text-lg">{cryptoIcons[crypto.symbol] || '●'}</span>
            <span className="font-medium text-foreground">{crypto.symbol}</span>
            <span className="text-muted-foreground transition-all duration-300">
              ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "flex items-center gap-0.5 transition-all duration-300",
              crypto.change24h >= 0 ? 'text-primary' : 'text-destructive'
            )}>
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
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Live Crypto Prices</h3>
        <div className={cn(
          "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
          isConnected 
            ? "bg-primary/10 text-primary" 
            : isConnecting 
            ? "bg-amber-500/10 text-amber-500" 
            : "bg-destructive/10 text-destructive"
        )}>
          {isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span>{isConnected ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {prices.map((crypto) => (
          <div 
            key={crypto.symbol} 
            className="p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{cryptoIcons[crypto.symbol] || '●'}</span>
              <div>
                <p className="font-semibold text-foreground">{crypto.symbol}</p>
                <p className="text-xs text-muted-foreground">{crypto.name}</p>
              </div>
            </div>
            <p className="text-lg font-bold text-foreground transition-all duration-300">
              ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={cn(
              "flex items-center gap-1 text-sm transition-all duration-300",
              crypto.change24h >= 0 ? 'text-primary' : 'text-destructive'
            )}>
              {crypto.change24h >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
