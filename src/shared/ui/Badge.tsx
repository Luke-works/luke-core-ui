import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

/**
 * Badge — TailAdmin "light" variant styling, dark-mode aware, mapped to our
 * existing semantic variants. Preserved API so existing call sites stay intact.
 */
const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
  info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
  success:
    'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  warning:
    'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  danger: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  muted: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
  startIcon,
  endIcon,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {startIcon && <span className="-ml-0.5">{startIcon}</span>}
      {children}
      {endIcon && <span className="-mr-0.5">{endIcon}</span>}
    </span>
  );
}
