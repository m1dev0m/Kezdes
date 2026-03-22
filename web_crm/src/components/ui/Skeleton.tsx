import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SkeletonVariant = 'line' | 'circle' | 'card' | 'custom';

export interface SkeletonProps {
  className?: string;
  count?: number;
  variant?: SkeletonVariant;
  style?: React.CSSProperties;
}

const variantStyles: Record<SkeletonVariant, string> = {
  line: 'h-4 w-full rounded-md',
  circle: 'h-12 w-12 rounded-full',
  card: 'h-32 w-full rounded-xl',
  custom: '',
};

export function Skeleton({ className = '', count = 1, variant = 'line', style }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={style}
          className={cn(
            'bg-slate-200 dark:bg-slate-800',
            variantStyles[variant],
            className
          )}
        />
      ))}
    </>
  );
}

export function TableSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex gap-4 px-4 bg-white p-3 border rounded-lg shadow-sm">
        <Skeleton variant="line" className="h-4 w-1/4" />
        <Skeleton variant="line" className="h-4 w-1/4" />
        <Skeleton variant="line" className="h-4 w-1/4" />
        <Skeleton variant="line" className="h-4 w-1/4" />
      </div>
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden divide-y divide-slate-100">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="flex px-4 py-4 gap-4">
            <Skeleton variant="line" className="h-4 w-1/4" />
            <Skeleton variant="line" className="h-4 w-1/4" />
            <Skeleton variant="line" className="h-4 w-1/4" />
            <Skeleton variant="line" className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
