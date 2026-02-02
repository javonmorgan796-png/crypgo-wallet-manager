import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './dialog';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
  actionLabel = 'Continue',
  onAction
}: FeedbackDialogProps) {
  const iconMap = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle
  };

  const colorMap = {
    success: 'text-green-500 bg-green-500/10',
    error: 'text-red-500 bg-red-500/10',
    warning: 'text-amber-500 bg-amber-500/10'
  };

  const Icon = iconMap[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader className="flex flex-col items-center text-center pt-6">
          <div className={`h-20 w-20 rounded-full ${colorMap[type]} flex items-center justify-center mb-4`}>
            <Icon className={`h-10 w-10 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">{title}</DialogTitle>
          <p className="text-muted-foreground mt-2 text-center">{message}</p>
        </DialogHeader>
        <div className="flex justify-center mt-6 pb-2">
          <Button
            onClick={() => {
              if (onAction) onAction();
              onOpenChange(false);
            }}
            className={`min-w-32 ${
              type === 'success'
                ? 'bg-green-500 hover:bg-green-600'
                : type === 'error'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600'
            } text-white`}
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
