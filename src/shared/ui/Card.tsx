import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  desc?: string;
  action?: React.ReactNode;
  /** When true (default), uses TailAdmin's titled card layout: padded header + divided body. */
  divided?: boolean;
}

/**
 * Card — TailAdmin-style rounded surface (rounded-2xl, border, dark mode aware).
 *
 * - Untitled cards: single padded container.
 * - Titled cards: padded header (title + optional desc + action), divider, padded body.
 */
export default function Card({
  children,
  className = '',
  title,
  desc,
  action,
  divided = true,
}: CardProps) {
  const hasHeader = !!(title || desc || action);
  const shell =
    'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]';

  if (!hasHeader) {
    return <div className={`${shell} p-5 ${className}`}>{children}</div>;
  }

  return (
    <div className={`${shell} ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          {title && (
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {title}
            </h3>
          )}
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div
        className={`p-5 sm:p-6 ${
          divided ? 'border-t border-gray-100 dark:border-gray-800' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}
