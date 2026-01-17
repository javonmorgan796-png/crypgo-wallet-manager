import { BarChart3, TrendingUp, PieChart, Users, LucideIcon } from 'lucide-react';

interface ChartEmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  height?: number;
}

export function ChartEmptyState({ 
  icon: Icon = BarChart3, 
  title = 'No data available',
  description = 'Data will appear here once there is activity.',
  height = 300 
}: ChartEmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center text-center gap-3 p-6"
      style={{ height }}
    >
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70">{description}</p>
      </div>
    </div>
  );
}
