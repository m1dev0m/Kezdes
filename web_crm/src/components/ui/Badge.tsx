import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral';
}

const badgeVariants = {
  default: 'bg-primary-100 text-primary-800 ring-primary-600/20',
  success: 'bg-success-100 text-success-800 ring-success-600/20',
  warning: 'bg-warning-100 text-warning-800 ring-warning-600/20',
  error: 'bg-error-100 text-error-800 ring-error-600/20',
  neutral: 'bg-neutral-100 text-neutral-800 ring-neutral-600/20',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
