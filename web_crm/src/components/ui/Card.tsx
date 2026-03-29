import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glass' | 'outline' | 'ghost';
  noPadding?: boolean;
}

export function Card({ className, variant = 'default', noPadding = false, ...props }: CardProps) {
  const variants = {
    default: 'bg-white border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    glass: 'bg-white/70 backdrop-blur-xl border-white/20 shadow-xl',
    outline: 'bg-transparent border-slate-200/80',
    ghost: 'bg-slate-50 border-transparent'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-[1.5rem] border transition-all duration-300',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-bold tracking-tight text-slate-900', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-500 font-medium leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, noPadding = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }) {
  return <div className={cn(noPadding ? 'p-0' : 'p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
