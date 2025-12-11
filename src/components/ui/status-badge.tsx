import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-success/20 text-success': status === 'success',
          'bg-destructive/20 text-destructive': status === 'error',
          'bg-warning/20 text-warning': status === 'warning',
          'bg-primary/20 text-primary': status === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
}