import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-theme-xs',
  md: 'px-4 py-2.5 text-theme-sm',
  lg: 'px-5 py-3 text-theme-sm',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300',
  secondary:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]',
  danger:
    'bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
}
