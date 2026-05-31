import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = 480,
}: DrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full flex flex-col bg-white border-l border-gray-200 shadow-theme-xl dark:bg-gray-900 dark:border-gray-800 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${width}px`, maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </>
  );
}
