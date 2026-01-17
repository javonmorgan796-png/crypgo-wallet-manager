import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface BalanceDisplayProps {
  balance: number;
  className?: string;
}

export function BalanceDisplay({ balance, className = '' }: BalanceDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <p className="font-semibold text-foreground text-base">
        {isVisible ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '******'}
      </p>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
        aria-label={isVisible ? 'Hide balance' : 'Show balance'}
      >
        {isVisible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
