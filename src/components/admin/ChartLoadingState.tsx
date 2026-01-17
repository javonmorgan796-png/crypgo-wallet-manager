import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartLoadingStateProps {
  height?: number;
  variant?: 'spinner' | 'skeleton';
}

export function ChartLoadingState({ height = 300, variant = 'spinner' }: ChartLoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-3 p-4" style={{ height }}>
        <div className="flex items-end gap-2 h-full">
          <Skeleton className="w-1/6 h-[40%]" />
          <Skeleton className="w-1/6 h-[65%]" />
          <Skeleton className="w-1/6 h-[45%]" />
          <Skeleton className="w-1/6 h-[80%]" />
          <Skeleton className="w-1/6 h-[55%]" />
          <Skeleton className="w-1/6 h-[70%]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
