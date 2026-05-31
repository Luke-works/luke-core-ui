import type { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-medium mb-1 text-gray-800 dark:text-white/90">
        {title}
      </h3>
      <p className="text-theme-sm mb-6 max-w-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
