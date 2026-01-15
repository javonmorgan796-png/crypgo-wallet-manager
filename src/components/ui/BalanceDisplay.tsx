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
      <p className="font-semibold text-foreground">
        {isVisible ? `$${balance.toLocaleString()}` : '******'}
      </p>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="text-muted-foreground hover:text-foreground transition-colors"
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
