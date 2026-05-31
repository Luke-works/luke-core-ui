import React from 'react';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: TooltipSide;
  wide?: boolean;
}

const positionClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export default function Tooltip({
  content,
  children,
  side = 'top',
  wide,
}: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        className={`absolute ${positionClasses[side]} z-50 px-3 py-2 text-theme-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg shadow-tooltip border bg-gray-900 text-white border-gray-800 dark:bg-white dark:text-gray-900 dark:border-gray-200 ${
          wide ? 'w-72' : 'max-w-xs'
        }`}
        style={{
          whiteSpace: wide ? 'normal' : 'nowrap',
          lineHeight: 1.5,
        }}
      >
        {content}
      </div>
    </div>
  );
}
