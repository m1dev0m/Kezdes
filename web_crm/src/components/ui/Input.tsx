import { forwardRef, useId } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helper, leftIcon, rightIcon, ...props }, ref) => {
    const fallbackId = useId();
    const id = props.id || fallbackId;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#1d4ed8]">
              <div className="text-slate-400 group-focus-within:text-inherit">{leftIcon}</div>
            </div>
          )}
          <input
            type={type}
            id={id}
            className={cn(
              'flex h-14 w-full rounded-2xl border border-slate-200 bg-[#fafaf9] px-4 py-2 text-sm font-medium text-slate-900 ring-offset-white placeholder:text-slate-400 outline-none transition-all focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-50',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#1d4ed8]">
              <div className="text-slate-400 group-focus-within:text-inherit">{rightIcon}</div>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs font-medium text-rose-500 ml-1">{error}</p>
        )}
        {helper && !error && (
          <p className="mt-1 text-xs font-medium text-slate-400 ml-1">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
