import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon
}: ButtonProps) {
  const variants = {
    primary: 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] shadow-[0_10px_20px_-10px_rgba(29,78,216,0.4)]',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_10px_20px_-10px_rgba(244,63,94,0.4)]',
    ghost: 'text-slate-600 hover:bg-slate-50',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    white: 'bg-white text-slate-900 border border-slate-100 shadow-sm hover:bg-slate-50'
  };

  const sizes = {
    sm: 'h-9 px-4 text-[12px] rounded-xl',
    md: 'h-11 px-6 text-sm rounded-2xl',
    lg: 'h-13 px-8 text-base rounded-2xl',
    xl: 'h-14 px-10 text-base rounded-2xl'
  };

  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
      ) : leftIcon ? (
        <span className="mr-2 flex items-center">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && (
        <span className="ml-2 flex items-center">{rightIcon}</span>
      )}
    </motion.button>
  );
}
